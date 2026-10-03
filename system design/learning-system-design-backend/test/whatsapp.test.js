const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const express = require('express');
const { SQLiteStore } = require('../src/services/whatsapp/store');
const { WhatsAppService } = require('../src/services/whatsapp/service');
const { MetaProvider, WhatsAppError, normalizePhone } = require('../src/services/whatsapp/metaProvider');
const { webhookRouter } = require('../src/routes/whatsappWebhook');
const { parseHistoryQuery } = require('../src/services/whatsapp/validation');
const env = { WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_BUSINESS_ACCOUNT_ID: '456', WHATSAPP_DEFAULT_COUNTRY: 'IN', WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'test-verifier', WHATSAPP_APP_SECRET: 'test-app-secret', WHATSAPP_ACCESS_TOKEN: 'test-only-token', WHATSAPP_GRAPH_API_VERSION: 'v25.0' };
const now = () => String(Math.floor(Date.now()/1000));
const incoming = (id = 'wamid.in') => ({ id, from: '919876543210', timestamp: now(), type: 'text', text: { body: 'Hello Commit' } });
const payload = value => ({ object: 'whatsapp_business_account', entry: [{ id: '456', changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, ...value } }] }] });
function fixture(t, provider = { send: async () => ({ messageId: 'wamid.out', timestamp: new Date().toISOString() }) }, crm) {
  const store = new SQLiteStore(':memory:');
  t.after(() => store.close());
  return { store, service: new WhatsAppService({ store, provider, crm, env }) };
}

test('phone normalization accepts formatted local and Meta international numbers; rejects abuse', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '919876543210');
  assert.equal(normalizePhone('9876543210'), '919876543210');
  assert.equal(normalizePhone('919876543210'), '919876543210');
  assert.throws(() => normalizePhone('https://example.com'));
  assert.throws(() => normalizePhone('12'));
});

test('valid inbound associates existing customer and updates conversation', async t => {
  const { service, store } = fixture(t, undefined, { customer: { findMany: async () => [{ id: 'customer-1', whatsapp: '+91 98765 43210', companyName: 'Customer One' }] } });
  await service.webhook(payload({ messages: [incoming()] }));
  const conversations = await store.conversations();
  assert.equal(conversations[0].customerId, 'customer-1');
  assert.equal(conversations[0].lastMessage, 'Hello Commit');
  assert.equal(conversations[0].unreadCount, 1);
  assert.equal((await store.messages())[0].direction, 'INCOMING');
});

test('unknown sender is retained; repeated and concurrent events are idempotent', async t => {
  const { service, store } = fixture(t);
  await Promise.all(Array.from({ length: 4 }, () => service.webhook(payload({ messages: [incoming()] }))));
  assert.equal((await store.messages()).length, 1);
  const conversation = (await store.conversations())[0];
  assert.match(conversation.customerName, /Unknown contact/);
  assert.equal(conversation.unreadCount, 1);
});

test('malformed events fail safely and wrong account/number events are ignored', async t => {
  const { service, store } = fixture(t);
  await assert.rejects(service.webhook({ entry: 'bad' }), /Malformed/);
  await assert.rejects(service.webhook(payload({ messages: [{ ...incoming(), text: {} }] })), /Malformed/);
  const wrong = payload({ messages: [incoming()] });
  wrong.entry[0].changes[0].value.metadata.phone_number_id = '999';
  assert.equal((await service.webhook(wrong)).handled, 0);
  assert.equal((await store.messages()).length, 0);
});

test('outbound stores real ID and accepted state; text outside service window fails before send', async t => {
  const { service, store } = fixture(t);
  await assert.rejects(service.send({ to: '919876543210', message: 'Reply' }), /24-hour/);
  await service.webhook(payload({ messages: [incoming()] }));
  const sent = await service.send({ to: '919876543210', message: 'Reply', sentBy: 'user-1', relatedId: 'quote-1', messageType: 'QUOTATION' });
  assert.equal(sent.messageId, 'wamid.out');
  assert.equal(sent.status, 'ACCEPTED');
  assert.equal(sent.relatedId, 'quote-1');
  assert.equal((await store.messages()).length, 2);
});

test('provider rejection persists FAILED; ambiguous network errors persist UNKNOWN without retry', async t => {
  let calls = 0;
  const { service, store } = fixture(t, { send: async () => { calls++; throw new WhatsAppError('Rejected by Meta.', 502, { metaCode: 190 }); } });
  const args = { to: '919876543210', template: { name: 'hello_world', language: { code: 'en_US' } } };
  await assert.rejects(service.send(args), /Rejected/);
  assert.equal((await store.messages())[0].status, 'FAILED');
  assert.equal(calls, 1);
  service.provider.send = async () => { throw new WhatsAppError('Network failure.', 502, { uncertain: true }); };
  await assert.rejects(service.send(args), /Network/);
  assert.equal((await store.messages()).filter(m => m.status === 'UNKNOWN').length, 1);
});

test('sent, delivered, read events persist and out-of-order statuses cannot downgrade read', async t => {
  const { service, store } = fixture(t);
  await service.send({ to: '919876543210', template: { name: 'hello_world', language: { code: 'en_US' } } });
  for (const status of ['sent', 'delivered', 'read']) {
    await service.webhook(payload({ statuses: [{ id: 'wamid.out', status, timestamp: now() }] }));
    assert.equal((await store.getMessage('wamid.out')).status, status.toUpperCase());
  }
  await service.webhook(payload({ statuses: [{ id: 'wamid.out', status: 'sent', timestamp: now() }] }));
  assert.equal((await store.getMessage('wamid.out')).status, 'READ');
  assert.equal((await store.events('wamid.out')).length, 3);
});

test('failed delivery persists safe Meta failure information', async t => {
  const { service, store } = fixture(t);
  await service.send({ to: '919876543210', template: { name: 'hello_world', language: { code: 'en_US' } } });
  await service.webhook(payload({ statuses: [{ id: 'wamid.out', status: 'failed', timestamp: now(), errors: [{ code: 131030, title: 'Ignore this text' }] }] }));
  const message = await store.getMessage('wamid.out');
  assert.equal(message.status, 'FAILED');
  assert.equal(message.failure.code, 131030);
});

test('status arriving before outbound response is reconciled', async t => {
  const { service, store } = fixture(t);
  await service.webhook(payload({ statuses: [{ id: 'wamid.out', status: 'read', timestamp: now() }] }));
  const message = await service.send({ to: '919876543210', template: { name: 'hello_world', language: { code: 'en_US' } } });
  assert.equal(message.status, 'READ');
  assert.equal((await store.events('wamid.out')).length, 1);
});

test('durable SQLite records survive a connection restart', async () => {
  const filename = path.join(mkdtempSync(path.join(tmpdir(), 'commit-whatsapp-test-')), 'messages.sqlite');
  let store = new SQLiteStore(filename);
  let service = new WhatsAppService({ store, env });
  await service.webhook(payload({ messages: [incoming('wamid.durable')] }));
  store.close();
  store = new SQLiteStore(filename);
  service = new WhatsAppService({ store, env });
  await service.webhook(payload({ messages: [incoming('wamid.durable')] }));
  assert.equal((await store.messages()).length, 1);
  assert.equal((await store.conversations())[0].unreadCount, 1);
  store.close();
});

test('existing lead is associated without creating a duplicate CRM entity', async t => {
  const { service, store } = fixture(t, undefined, { customer: { findMany: async () => [] }, lead: { findMany: async () => [{ id: 'lead-1', mobile: '9876543210', companyName: 'Existing lead' }] } });
  await service.webhook(payload({ messages: [incoming()] }));
  assert.equal((await store.conversations())[0].leadId, 'lead-1');
});

test('missing credentials persist an honest outbound failure', async t => {
  const { service, store } = fixture(t, new MetaProvider({ env: {} }));
  await assert.rejects(service.send({ to: '919876543210', template: { name: 'hello_world', language: { code: 'en_US' } } }), /credentials/);
  assert.equal((await store.messages())[0].status, 'FAILED');
});

test('replayed send returns the same persisted message without another Meta request', async t => {
  let sends = 0;
  const { service, store } = fixture(t, { send: async () => ({ messageId: `wamid.replay.${++sends}`, timestamp: new Date().toISOString() }) });
  const args = { to: '919876543210', idempotencyKey: 'request-key-1', template: { name: 'hello_world', language: { code: 'en_US' } } };
  const first = await service.send(args);
  assert.equal((await service.send(args)).id, first.id);
  assert.equal(sends, 1);
  assert.equal((await store.messages()).length, 1);
  await assert.rejects(service.send({ ...args, template: { name: 'different_template', language: { code: 'en_US' } } }), e => e.status === 409);
  await assert.rejects(service.send({ ...args, sentBy: 'another-user' }), e => e.status === 409);
  assert.equal(sends, 1);
});

test('concurrent retries and uncertain sends cannot cause a second Meta send', async t => {
  let release;
  let sends = 0;
  const gate = new Promise(resolve => { release = resolve; });
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const { service } = fixture(t, { send: async () => { sends++; started(); await gate; throw new WhatsAppError('Timeout.', 502, { uncertain: true }); } });
  const args = { to: '919876543210', idempotencyKey: 'concurrent-request', template: { name: 'hello_world', language: { code: 'en_US' } } };
  const first = service.send(args);
  const rejected = assert.rejects(first, /Timeout/);
  await ready;
  await assert.rejects(service.send(args), e => e.status === 409 && e.uncertain);
  release();
  await rejected;
  await assert.rejects(service.send(args), e => e.status === 409 && e.uncertain);
  assert.equal(sends, 1);
});

test('failed request replay remains failed and invalid keys are rejected before sending', async t => {
  let sends = 0;
  const { service } = fixture(t, { send: async () => { sends++; throw new WhatsAppError('Rejected.', 502); } });
  const args = { to: '919876543210', idempotencyKey: 'failed-request-1', template: { name: 'hello_world', language: { code: 'en_US' } } };
  await assert.rejects(service.send(args), /Rejected/);
  await assert.rejects(service.send(args), e => e.status === 409);
  await assert.rejects(service.send({ ...args, idempotencyKey: ['invalid'] }), e => e.status === 400);
  assert.equal(sends, 1);
});

test('history query rejects malformed, repeated and unbounded inputs', () => {
  assert.deepEqual(parseHistoryQuery({ page: '2', limit: '10', phone: '+91 98765 43210' }), { page: 2, limit: 10, phone: '919876543210', type: undefined });
  for (const page of ['Infinity', '-1', '1.5', '1000001', ['1', '2']]) assert.throws(() => parseHistoryQuery({ page }), /Invalid page/);
  assert.throws(() => parseHistoryQuery({ limit: '101' }), /Invalid limit/);
  assert.throws(() => parseHistoryQuery({ phone: { number: '123' } }), /valid/);
  assert.throws(() => parseHistoryQuery({ type: ['TEXT'] }), /message type/);
});

test('persisted request keys prevent resending after a backend connection restart', async () => {
  const filename = path.join(mkdtempSync(path.join(tmpdir(), 'commit-send-restart-')), 'messages.sqlite');
  let sends = 0;
  const provider = { send: async () => ({ messageId: `wamid.restart.${++sends}`, timestamp: new Date().toISOString() }) };
  let store = new SQLiteStore(filename);
  let service = new WhatsAppService({ store, env, provider });
  const args = { to: '919876543210', idempotencyKey: 'durable-send-key', template: { name: 'hello_world', language: { code: 'en_US' } } };
  const sent = await service.send(args);
  store.close();
  store = new SQLiteStore(filename);
  service = new WhatsAppService({ store, env, provider });
  assert.equal((await service.send(args)).id, sent.id);
  assert.equal(sends, 1);
  store.close();
});

test('storage failure after Meta acceptance keeps the ID and uncertain state for reconciliation', async t => {
  let sends = 0;
  const { service, store } = fixture(t, { send: async () => ({ messageId: `wamid.storage.${++sends}`, timestamp: new Date().toISOString() }) });
  const update = store.updateMessage.bind(store);
  let failOnce = true;
  store.updateMessage = async (id, data) => {
    if (data.status === 'ACCEPTED' && failOnce) { failOnce = false; throw Error('Temporary write failure'); }
    return update(id, data);
  };
  const args = { to: '919876543210', idempotencyKey: 'accepted-storage-key', template: { name: 'hello_world', language: { code: 'en_US' } } };
  await assert.rejects(service.send(args), e => e.status === 503 && e.uncertain);
  assert.equal((await store.getMessage('wamid.storage.1')).status, 'UNKNOWN');
  await assert.rejects(service.send(args), e => e.status === 409);
  await service.webhook(payload({ statuses: [{ id: 'wamid.storage.1', status: 'read', timestamp: now() }] }));
  assert.equal((await service.send(args)).status, 'READ');
  assert.equal(sends, 1);
});

test('provider sends official payload and Authorization header; handles missing configuration and rejection', async () => {
  let request;
  const provider = new MetaProvider({ env, fetchImpl: async (url, init) => { request = { url, init }; return new Response(JSON.stringify({ messages: [{ id: 'wamid.real' }] }), { status: 200 }); } });
  assert.equal((await provider.send({ to: '919876543210', message: 'Hello' })).messageId, 'wamid.real');
  assert.equal(request.url, 'https://graph.facebook.com/v25.0/123/messages');
  assert.equal(request.init.headers.Authorization, 'Bearer test-only-token');
  assert.equal(JSON.parse(request.init.body).text.body, 'Hello');
  await assert.rejects(new MetaProvider({ env: {} }).send({ to: '919876543210', message: 'Hi' }), /credentials/);
  provider.fetch = async () => new Response(JSON.stringify({ error: { code: 131030 } }), { status: 400 });
  await assert.rejects(provider.send({ to: '919876543210', message: 'Hi' }), /allowed test recipient/);
  let calls = 0;
  provider.fetch = async () => { calls++; throw Error('timeout'); };
  await assert.rejects(provider.send({ to: '919876543210', message: 'Hi' }), e => e.uncertain === true);
  assert.equal(calls, 1);
});

test('webhook HTTP verification, signatures, malformed body and persistence failure', async t => {
  let calls = 0;
  const app = express();
  const service = { webhook: async () => { calls++; return { handled: 1 }; } };
  app.use('/api/whatsapp/webhook', webhookRouter(service, env));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/whatsapp/webhook`;
  const valid = await fetch(`${base}?hub.mode=subscribe&hub.verify_token=test-verifier&hub.challenge=12345`);
  assert.equal(valid.status, 200);
  assert.equal(await valid.text(), '12345');
  assert.equal((await fetch(`${base}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`)).status, 403);
  const body = JSON.stringify(payload({ messages: [incoming()] }));
  const headers = { 'Content-Type': 'application/json', 'x-hub-signature-256': `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex')}` };
  assert.equal((await fetch(base, { method: 'POST', body, headers })).status, 200);
  assert.equal(calls, 1);
  assert.equal((await fetch(base, { method: 'POST', body: body+' ', headers })).status, 401);
  service.webhook = async () => { throw Error('database unavailable'); };
  assert.equal((await fetch(base, { method: 'POST', body, headers })).status, 503);
});
