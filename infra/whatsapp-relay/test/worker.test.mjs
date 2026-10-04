import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/worker.mjs';

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_inbox.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const prepare = sql => ({ bind(...params) { this.params = params; return this; }, first() { return db.prepare(sql).get(...(this.params || [])) || null; }, all() { return { results: db.prepare(sql).all(...(this.params || [])) }; }, run() { return db.prepare(sql).run(...(this.params || [])); } });
  const env = { DB: { prepare, batch: async statements => { db.exec('BEGIN'); try { const result = statements.map(s => s.run()); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } } }, WHATSAPP_APP_SECRET: 'test-only-app-secret', WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'test-only-verify', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_BUSINESS_ACCOUNT_ID: '456', RELAY_SYNC_TOKEN: 'test-only-relay' };
  return { env, db };
}
const payload = { object: 'whatsapp_business_account', entry: [{ id: '456', changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, messages: [{ id: 'wamid.demo', from: '919876543210', timestamp: '1791000000', type: 'text', text: { body: 'Demo' } }] } }] }] };
const url = 'https://demo.example/api/whatsapp/webhook';
function incoming(env, data = payload) {
  const body = JSON.stringify(data);
  return new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex')}` }, body });
}
const auth = env => ({ authorization: `Bearer ${env.RELAY_SYNC_TOKEN}` });

test('relay verifies callback tokens and fails closed when unconfigured', async t => {
  const { env } = fixture(t);
  assert.equal(await (await worker.fetch(new Request(`${url}?hub.mode=subscribe&hub.verify_token=test-only-verify&hub.challenge=demo`), env)).text(), 'demo');
  assert.equal((await worker.fetch(new Request(`${url}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=demo`), env)).status, 403);
  assert.equal((await worker.fetch(new Request(url), { ...env, WHATSAPP_WEBHOOK_VERIFY_TOKEN: '' })).status, 503);
});
test('signed events persist during backend downtime, deduplicate and require auth for sync', async t => {
  const { env, db } = fixture(t);
  assert.equal((await worker.fetch(incoming(env), env)).status, 200);
  assert.equal((await worker.fetch(incoming(env), env)).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM relay_events').get().n, 1);
  assert.equal((await worker.fetch(new Request('https://demo.example/relay/events'), env)).status, 401);
  const { events } = await (await worker.fetch(new Request('https://demo.example/relay/events', { headers: auth(env) }), env)).json();
  assert.equal(events.length, 1);
  assert.deepEqual(JSON.parse(events[0].payload), payload);
  assert.equal((await worker.fetch(new Request('https://demo.example/api/auth/login'), env)).status, 404);
});
test('unsigned, malformed, oversized and other-account events are not stored', async t => {
  const { env, db } = fixture(t);
  assert.equal((await worker.fetch(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), env)).status, 401);
  assert.equal((await worker.fetch(incoming(env, { object: 'bad' }), env)).status, 400);
  assert.equal((await worker.fetch(incoming(env, { ...payload, entry: [{ ...payload.entry[0], id: 'another' }] }), env)).status, 200);
  assert.equal((await worker.fetch(incoming(env, { padding: 'x'.repeat(256 * 1024) }), env)).status, 413);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM relay_events').get().n, 0);
});
test('ACK is authenticated and retention only removes old acknowledged copies', async t => {
  const { env, db } = fixture(t);
  await worker.fetch(incoming(env), env);
  const id = db.prepare('SELECT id FROM relay_events').get().id;
  const ack = () => new Request('https://demo.example/relay/ack', { method: 'POST', headers: auth(env), body: JSON.stringify({ ids: [id] }) });
  assert.equal((await worker.fetch(ack(), env)).status, 200);
  assert.equal((await worker.fetch(ack(), env)).status, 200);
  assert.equal((await (await worker.fetch(new Request('https://demo.example/relay/events', { headers: auth(env) }), env)).json()).events.length, 0);
  db.prepare('UPDATE relay_events SET consumed_at=?').run(Date.now() - 8 * 86400000);
  db.prepare('INSERT INTO relay_events VALUES (?,?,?,?,NULL)').run('unconsumed', '{}', 'signature', 0);
  await worker.scheduled({}, env);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM relay_events').get().n, 1);
  assert.equal(db.prepare('SELECT id FROM relay_events').get().id, 'unconsumed');
});
test('storage failures ask Meta to redeliver rather than acknowledge loss', async t => {
  const { env } = fixture(t);
  env.DB.prepare = () => { throw Error('outage'); };
  assert.equal((await worker.fetch(incoming(env), env)).status, 503);
});
test('backlog limit rejects new events but still acknowledges known redelivery', async t => {
  const { env, db } = fixture(t);
  await worker.fetch(incoming(env), env);
  db.exec('BEGIN');
  const insert = db.prepare('INSERT INTO relay_events VALUES (?,?,?,?,NULL)');
  for (let i = 0; i < 4999; i++) insert.run(`queued-${i}`, '{}', 'signature', i);
  db.exec('COMMIT');
  assert.equal((await worker.fetch(incoming(env), env)).status, 200);
  const next = structuredClone(payload);
  next.entry[0].changes[0].value.messages[0].id = 'wamid.another';
  assert.equal((await worker.fetch(incoming(env, next), env)).status, 503);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM relay_events').get().n, 5000);
});
