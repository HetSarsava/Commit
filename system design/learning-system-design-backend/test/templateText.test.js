const { test } = require('node:test');
const assert = require('node:assert/strict');
const { templateText } = require('../src/services/whatsapp/templateText');
const { WhatsAppService } = require('../src/services/whatsapp/service');
const { SQLiteStore } = require('../src/services/whatsapp/store');

const definition = { name: 'order_update', language: 'en_US', components: [
  { type: 'HEADER', text: 'Order {{1}}' }, { type: 'BODY', text: 'Hello {{customer}}, your order is ready.' },
  { type: 'FOOTER', text: 'Thank you' }, { type: 'BUTTONS', buttons: [{ text: 'View order' }] },
] };
const sent = { name: 'order_update', language: { code: 'en_US' }, components: [
  { type: 'header', parameters: [{ type: 'text', text: '123' }] },
  { type: 'body', parameters: [{ type: 'text', parameter_name: 'customer', text: 'Het {{1}}' }] },
] };
test('template text renders header, named/numbered values, footer and button labels without recursive substitution', () => {
  assert.equal(templateText(definition, sent), 'Order 123\n\nHello Het {{1}}, your order is ready.\n\nThank you\n\nView order');
  assert.equal(templateText(definition, { ...sent, components: [] }), null);
  assert.equal(templateText(definition, { ...sent, language: { code: 'hi' } }), null);
});
test('send snapshots approved text, keeps exact Meta parameters and replays without sending twice', async t => {
  const store = new SQLiteStore(':memory:'); t.after(() => store.close());
  let sends = 0;
  const provider = { templates: async () => [definition], send: async args => {
    sends++; assert.deepEqual(args.template, sent);
    return { messageId: 'wamid.preview', timestamp: new Date().toISOString() };
  } };
  const service = new WhatsAppService({ store, provider });
  const args = { to: '919876543210', template: sent, idempotencyKey: 'preview-test-123' };
  const record = await service.send(args);
  assert.equal(record.message, templateText(definition, sent));
  definition.components[0].text = 'Changed';
  assert.equal((await service.send(args)).message, record.message);
  assert.equal(sends, 1);
  assert.equal((await service.displayMessage(record)).message, record.message);
});
test('missing template definition remains honest and does not prevent sending', async t => {
  const store = new SQLiteStore(':memory:'); t.after(() => store.close());
  const service = new WhatsAppService({ store, provider: { templates: async () => { throw Error('unavailable'); }, send: async () => ({ messageId: 'wamid.fallback', timestamp: new Date().toISOString() }) } });
  const record = await service.send({ to: '919876543210', template: sent });
  assert.equal((await service.displayMessage(record)).message, 'Template message — text unavailable');
});
