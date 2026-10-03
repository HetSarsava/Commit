const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaStore } = require('../src/services/whatsapp/store');
const { WhatsAppService } = require('../src/services/whatsapp/service');

test('Prisma store persists inbound, duplicate events and outbound status in PostgreSQL', { skip: !process.env.WHATSAPP_TEST_DATABASE_URL }, async t => {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.WHATSAPP_TEST_DATABASE_URL } } });
  t.after(() => prisma.$disconnect());
  const id = randomUUID();
  const phone = '919876543210';
  const env = { WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_BUSINESS_ACCOUNT_ID: '456', WHATSAPP_DEFAULT_COUNTRY: 'IN' };
  const service = new WhatsAppService({ store: new PrismaStore(prisma), crm: prisma, env, provider: { send: async () => ({ messageId: `wamid.${id}.out`, timestamp: new Date().toISOString() }) } });
  const payload = value => ({ object: 'whatsapp_business_account', entry: [{ id: '456', changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, ...value } }] }] });
  const inbound = payload({ messages: [{ id: `wamid.${id}.in`, from: phone, timestamp: String(Math.floor(Date.now()/1000)), type: 'text', text: { body: 'PostgreSQL inbound test' } }] });
  await service.webhook(inbound);
  await service.webhook(inbound);
  assert.equal(await prisma.whatsappMessage.count({ where: { messageId: `wamid.${id}.in` } }), 1);
  const args = { to: phone, message: 'PostgreSQL response', idempotencyKey: `postgres-${id}` };
  const message = await service.send(args);
  assert.equal((await service.send(args)).id, message.id);
  await service.webhook(payload({ statuses: [{ id: message.messageId, status: 'read', timestamp: String(Math.floor(Date.now()/1000)) }] }));
  assert.equal((await prisma.whatsappMessage.findUnique({ where: { id: message.id } })).status, 'READ');
  await service.webhook(payload({ statuses: [{ id: `wamid.${id}.early`, status: 'failed', timestamp: String(Math.floor(Date.now()/1000)), errors: [{ code: 131030 }] }] }));
  assert.equal((await prisma.whatsappStatusEvent.findFirst({ where: { messageId: `wamid.${id}.early` } })).failure.code, 131030);
});
