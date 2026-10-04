const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { RelaySync } = require('../src/services/whatsapp/relaySync');
const { WhatsAppService } = require('../src/services/whatsapp/service');
const { SQLiteStore } = require('../src/services/whatsapp/store');
const { MetaProvider } = require('../src/services/whatsapp/metaProvider');
const env = { WHATSAPP_RELAY_URL: 'https://commit-demo.example.workers.dev', WHATSAPP_RELAY_SYNC_TOKEN: 'test-sync-only', WHATSAPP_APP_SECRET: 'test-app-only', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_BUSINESS_ACCOUNT_ID: '456' };
const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '456', changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, messages: [{ id: 'wamid.relay', from: '919876543210', timestamp: String(Math.floor(Date.now()/1000)), type: 'text', text: { body: 'Offline demo message' } }] } }] }] });
const event = { id: 'a'.repeat(64), payload, signature: `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(payload).digest('hex')}` };
test('relay sync persists events before ACK and local idempotency survives a lost ACK', async t => {
  const store = new SQLiteStore(':memory:');
  t.after(() => store.close());
  const service = new WhatsAppService({ store, env });
  let ackFails = true, acks = 0;
  const sync = new RelaySync({ service, env, log: () => {}, fetchImpl: async (url, init) => {
    assert.equal(init.headers.Authorization, `Bearer ${env.WHATSAPP_RELAY_SYNC_TOKEN}`);
    if (url.endsWith('/relay/events')) return Response.json({ events: [event] });
    assert.equal((await store.messages()).length, 1);
    if (ackFails) { ackFails = false; return new Response('', { status: 503 }); }
    acks++;
    return Response.json({ acknowledged: 1 });
  } });
  await assert.rejects(sync.once(), /503/);
  assert.equal((await sync.once()).synced, 1);
  assert.equal((await store.messages()).length, 1);
  assert.equal((await store.conversations())[0].unreadCount, 1);
  assert.equal(acks, 1);
});
test('relay does not ACK a failed persistence or tampered signature', async () => {
  let acks = 0;
  let tampered = false;
  const sync = new RelaySync({ env, service: { webhook: async () => { throw Error('storage'); } }, log: () => {}, fetchImpl: async url => {
    if (url.endsWith('/relay/events')) return Response.json({ events: [{ ...event, ...(tampered ? { payload: '{}' } : {}) }] });
    acks++;
    return Response.json({});
  } });
  await assert.rejects(sync.once(), /storage/);
  tampered = true;
  await assert.rejects(sync.once(), /signature/);
  assert.equal(acks, 0);
});
test('relay refuses insecure or credential-bearing origins', () => {
  for (const url of ['http://demo.workers.dev', 'https://evil.example', 'https://user:secret@demo.workers.dev', 'https://demo.workers.dev/path', 'https://demo.workers.dev/?token=secret']) {
    assert.throws(() => new RelaySync({ env: { ...env, WHATSAPP_RELAY_URL: url } }).config());
  }
});
test('demo send guard fails closed and only allows explicitly listed recipients', async () => {
  let calls = 0;
  const config = { WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_ACCESS_TOKEN: 'test-only', WHATSAPP_DEMO_MODE: 'true', WHATSAPP_DEMO_RECIPIENTS: '919876543210' };
  const provider = new MetaProvider({ env: config, fetchImpl: async () => { calls++; return Response.json({ messages: [{ id: 'wamid.demo.guard' }] }); } });
  await assert.rejects(provider.send({ to: '919876543211', message: 'blocked' }), e => e.status === 403);
  config.WHATSAPP_DEMO_RECIPIENTS = '';
  await assert.rejects(provider.send({ to: '919876543210', message: 'blocked' }), e => e.status === 403);
  assert.equal(calls, 0);
  config.WHATSAPP_DEMO_RECIPIENTS = '919876543210';
  assert.equal((await provider.send({ to: '919876543210', message: 'allowed' })).messageId, 'wamid.demo.guard');
  assert.equal(calls, 1);
});
