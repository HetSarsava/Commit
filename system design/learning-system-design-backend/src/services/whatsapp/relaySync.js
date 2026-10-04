const { createHmac, timingSafeEqual } = require('node:crypto');

class RelaySync {
  constructor({ service, env = process.env, fetchImpl = global.fetch, log = entry => console.info(JSON.stringify(entry)) }) {
    this.service = service;
    this.env = env;
    this.fetch = fetchImpl;
    this.log = log;
    this.running = false;
    this.timer = null;
  }
  config() {
    const url = new URL(this.env.WHATSAPP_RELAY_URL);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Relay URL must be an HTTPS workers.dev origin.');
    if (!this.env.WHATSAPP_RELAY_SYNC_TOKEN || !this.env.WHATSAPP_APP_SECRET) throw Error('Relay credentials missing.');
    return url.origin;
  }
  async request(path, body) {
    const response = await this.fetch(`${this.config()}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${this.env.WHATSAPP_RELAY_SYNC_TOKEN}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    if (!response.ok) throw Error(`Relay HTTP ${response.status}`);
    // Bound the response even if the remote service is misconfigured.
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 3 * 1024 * 1024) { await reader.cancel(); throw Error('Relay response too large.'); }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  async once() {
    if (this.running) return;
    this.running = true;
    try {
      const data = await this.request('/relay/events');
      if (!Array.isArray(data.events) || data.events.length > 10) throw Error('Invalid relay response.');
      let synced = 0;
      for (const event of data.events) {
        if (typeof event?.id !== 'string' || !/^[a-f0-9]{64}$/.test(event.id) || typeof event.payload !== 'string' || Buffer.byteLength(event.payload) > 256 * 1024 || !/^sha256=[a-f0-9]{64}$/.test(event.signature || '')) throw Error('Invalid relay event.');
        const expected = createHmac('sha256', this.env.WHATSAPP_APP_SECRET).update(event.payload).digest();
        if (!timingSafeEqual(expected, Buffer.from(event.signature.slice(7), 'hex'))) throw Error('Invalid relay signature.');
        await this.service.webhook(JSON.parse(event.payload));
        // A failed ACK leaves the event pending; local event IDs deduplicate replay.
        await this.request('/relay/ack', { ids: [event.id] });
        synced++;
      }
      if (synced) this.log({ event: 'whatsapp.relay_synced', batches: synced });
      return { synced };
    } finally { this.running = false; }
  }
  start() {
    this.config();
    const run = () => this.once().catch(() => this.log({ event: 'whatsapp.relay_sync_failed' }));
    const interval = Math.max(5000, Math.min(60000, Number(this.env.WHATSAPP_RELAY_POLL_MS) || 10000));
    this.timer = setInterval(run, interval);
    this.timer.unref();
    void run();
    return this;
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}

module.exports = { RelaySync };
