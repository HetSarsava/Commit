const encoder = new TextEncoder();
const MAX_BYTES = 256 * 1024;
const json = (data, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
const plain = (text, status) => new Response(text, { status, headers: { 'cache-control': 'no-store', 'content-type': 'text/plain' } });
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');

async function sameSecret(a, b) {
  if (!a || !b) return false;
  const [left, right] = await Promise.all([a, b].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const x = new Uint8Array(left), y = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}

async function readBody(request, max = MAX_BYTES) {
  if (Number(request.headers.get('content-length')) > max) throw Object.assign(Error(), { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(Error(), { status: 400 });
  const chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) { await reader.cancel(); throw Object.assign(Error(), { status: 413 }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function validSignature(bytes, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const supplied = Uint8Array.from(signature.slice(7).match(/../g), pair => parseInt(pair, 16));
  return crypto.subtle.verify('HMAC', key, supplied, bytes);
}

function matchingPayload(data, env) {
  if (data?.object !== 'whatsapp_business_account' || !Array.isArray(data.entry) || data.entry.length > 100) throw Object.assign(Error(), { status: 400 });
  let count = 0, matched = false;
  for (const entry of data.entry) {
    if (typeof entry?.id !== 'string' || !Array.isArray(entry.changes) || entry.changes.length > 100) throw Object.assign(Error(), { status: 400 });
    for (const change of entry.changes) {
      if (!change?.value || typeof change.field !== 'string') throw Object.assign(Error(), { status: 400 });
      const contacts = change.value.contacts;
      if (contacts !== undefined && (!Array.isArray(contacts) || contacts.length > 100 || contacts.some(contact => typeof contact?.wa_id !== 'string' || (contact.profile !== undefined && (typeof contact.profile?.name !== 'string' || contact.profile.name.length > 256))))) throw Object.assign(Error(), { status: 400 });
      for (const field of ['messages', 'statuses']) {
        const rows = change.value[field];
        if (rows !== undefined && (!Array.isArray(rows) || rows.length > 100)) throw Object.assign(Error(), { status: 400 });
        count += rows?.length || 0;
        for (const row of rows || []) {
          if (typeof row?.id !== 'string' || !row.id || row.id.length > 512 || typeof row.timestamp !== 'string' || !/^\d{1,12}$/.test(row.timestamp)) throw Object.assign(Error(), { status: 400 });
          if (new Date(Number(row.timestamp) * 1000).getUTCFullYear() > 2100) throw Object.assign(Error(), { status: 400 });
          if (field === 'messages' && (typeof row.from !== 'string' || !/^\d{7,15}$/.test(row.from) || typeof row.type !== 'string' || row.type.length > 50 || (row.type === 'text' && (typeof row.text?.body !== 'string' || row.text.body.length > 4096)))) throw Object.assign(Error(), { status: 400 });
          if (field === 'statuses' && !['sent', 'delivered', 'read', 'failed'].includes(row.status)) throw Object.assign(Error(), { status: 400 });
          if (field === 'statuses' && row.errors !== undefined && (!Array.isArray(row.errors) || row.errors.length > 10 || row.errors.some(error => typeof error?.code !== 'number'))) throw Object.assign(Error(), { status: 400 });
        }
      }
      if (entry.id === env.WHATSAPP_BUSINESS_ACCOUNT_ID && change.field === 'messages' && change.value.metadata?.phone_number_id === env.WHATSAPP_PHONE_NUMBER_ID) matched = true;
    }
  }
  if (count > 100) throw Object.assign(Error(), { status: 400 });
  return matched;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/health' && request.method === 'GET') return json({ status: 'ok' });
      if (url.pathname === '/api/whatsapp/webhook') {
        if (request.method === 'GET') {
          if (!env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) return plain('Unavailable', 503);
          const challenge = url.searchParams.get('hub.challenge');
          if (url.searchParams.get('hub.mode') !== 'subscribe' || !await sameSecret(url.searchParams.get('hub.verify_token'), env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) || !challenge || challenge.length > 1024) return plain('Forbidden', 403);
          return plain(challenge, 200);
        }
        if (request.method !== 'POST') return plain('Method not allowed', 405);
        if (!env.WHATSAPP_APP_SECRET || !env.WHATSAPP_BUSINESS_ACCOUNT_ID || !env.WHATSAPP_PHONE_NUMBER_ID) return plain('Unavailable', 503);
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return plain('Unsupported media type', 415);
        const bytes = await readBody(request);
        const signature = request.headers.get('x-hub-signature-256');
        if (!await validSignature(bytes, signature, env.WHATSAPP_APP_SECRET)) return plain('Unauthorized', 401);
        let payload;
        try { payload = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
        catch { return plain('Bad request', 400); }
        if (!matchingPayload(JSON.parse(payload), env)) return plain('OK', 200);
        const id = hex(await crypto.subtle.digest('SHA-256', bytes));
        // Known redelivery is acknowledged even if the queue is full.
        if (await env.DB.prepare('SELECT id FROM relay_events WHERE id=?').bind(id).first()) return plain('OK', 200);
        // Fail closed at the demo backlog limit rather than exhausting storage.
        await env.DB.prepare('INSERT OR IGNORE INTO relay_events (id,payload,signature,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM relay_events WHERE consumed_at IS NULL)<5000').bind(id, payload, signature, Date.now()).run();
        if (!await env.DB.prepare('SELECT id FROM relay_events WHERE id=?').bind(id).first()) return plain('Backlog full', 503);
        return plain('OK', 200);
      }
      if (!['/relay/events', '/relay/ack', '/relay/status'].includes(url.pathname)) return plain('Not found', 404);
      if (!env.RELAY_SYNC_TOKEN) return plain('Unavailable', 503);
      if (!await sameSecret(request.headers.get('authorization'), `Bearer ${env.RELAY_SYNC_TOKEN}`)) return plain('Unauthorized', 401);
      if (url.pathname === '/relay/events' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id,payload,signature,created_at FROM relay_events WHERE consumed_at IS NULL ORDER BY created_at,id LIMIT 10').all();
        return json({ events: results });
      }
      if (url.pathname === '/relay/status' && request.method === 'GET') return json(await env.DB.prepare('SELECT COUNT(*) AS pending, MIN(created_at) AS oldest FROM relay_events WHERE consumed_at IS NULL').first());
      if (url.pathname === '/relay/ack' && request.method === 'POST') {
        const data = JSON.parse(new TextDecoder().decode(await readBody(request, 2048)));
        if (!Array.isArray(data.ids) || data.ids.length < 1 || data.ids.length > 10 || data.ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))) return plain('Bad request', 400);
        await env.DB.batch(data.ids.map(id => env.DB.prepare('UPDATE relay_events SET consumed_at=? WHERE id=? AND consumed_at IS NULL').bind(Date.now(), id)));
        return json({ acknowledged: data.ids.length });
      }
      return plain('Method not allowed', 405);
    } catch (error) {
      // Never log request URLs, payloads, bearer tokens or signatures.
      return plain('Request could not be processed', error.status || (error instanceof SyntaxError ? 400 : 503));
    }
  },
  async scheduled(_event, env) {
    // Keep unconsumed events until synced; only prune acknowledged demo copies.
    await env.DB.prepare('DELETE FROM relay_events WHERE consumed_at IS NOT NULL AND consumed_at<?').bind(Date.now() - 7 * 86400000).run();
  },
};
