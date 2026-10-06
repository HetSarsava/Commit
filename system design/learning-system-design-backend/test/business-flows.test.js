const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SQLiteStore } = require('../src/services/whatsapp/store');
const { WhatsAppService } = require('../src/services/whatsapp/service');

test('quotation, order, payment and production controllers use the same real service and persist domain references', async t => {
  const store = new SQLiteStore(':memory:');
  t.after(() => store.close());
  const customer = { id: 'customer-1', companyName: 'Existing customer', contactPerson: 'Customer', whatsapp: '+91 98765 43210' };
  const items = [{ product: { name: 'Uniform' }, quantity: 2, unitPrice: 500 }];
  const crm = {
    settings: { findMany: async () => ['name', 'phone', 'email'].map(key => ({ key: `company.${key}`, value: JSON.stringify({ name: 'Test Uniform Company', phone: '+91 98765 43210', email: 'sales@example.com' }[key]) })) },
    customer: { findMany: async () => [customer] },
    quotation: { findUnique: async () => ({ id: 'quote-1', quotationNumber: 'QT-1', customer, items, total: 1000, createdAt: new Date(), validUntil: new Date(Date.now()+86400000) }) },
    salesOrder: { findUnique: async () => ({ id: 'order-1', orderNumber: 'SO-1', customer, items, total: 1000, createdAt: new Date(), expectedDelivery: new Date(Date.now()+86400000) }) },
    invoice: { findUnique: async () => ({ id: 'invoice-1', invoiceNumber: 'INV-1', customer, balanceDue: 1000, dueDate: new Date('2025-01-01T00:00:00Z') }) },
  };
  let sends = 0;
  const service = new WhatsAppService({ store, crm, env: { WHATSAPP_DEFAULT_COUNTRY: 'IN' }, provider: { send: async () => ({ messageId: `wamid.business.${++sends}`, timestamp: new Date().toISOString() }) } });
  const conversation = await service.createConversation(customer.whatsapp);
  await store.updateConversation(conversation.id, { lastInboundAt: new Date().toISOString() });
  require.cache[require.resolve('../src/config/database')] = { exports: { prisma: crm } };
  require.cache[require.resolve('../src/services/whatsapp')] = { exports: { service, store } };
  const controller = require('../src/controllers/whatsappController');
  const scenarios = [
    ['sendQuotation', { quotationId: 'quote-1' }, 'QUOTATION', 'quote-1'],
    ['sendOrderConfirmation', { orderId: 'order-1' }, 'ORDER_CONFIRMATION', 'order-1'],
    ['sendPaymentReminder', { invoiceId: 'invoice-1' }, 'PAYMENT_REMINDER', 'invoice-1'],
    ['sendProductionUpdate', { orderId: 'order-1', stage: 'QC' }, 'PRODUCTION_UPDATE', 'order-1'],
  ];
  for (const [name, body, messageType, relatedId] of scenarios) {
    let result;
    let error;
    const res = { json: value => { result = value; }, status: () => res };
    const req = { body, user: { id: 'user-1' }, get: header => header === 'Idempotency-Key' ? `business_${name}` : undefined };
    await controller[name](req, res, e => { error = e; });
    assert.equal(error, undefined);
    const record = result.result || result;
    assert.equal(record.status, 'ACCEPTED');
    assert.equal(record.messageType, messageType);
    assert.match(record.message, /Test Uniform Company/);
    assert.doesNotMatch(record.message, /AMIT UNIFORM/);
    assert.equal(record.relatedId, relatedId);
    assert.equal(record.sentBy, 'user-1');
    assert.equal(record.conversationId, conversation.id);
    await controller[name](req, res, e => { error = e; });
    assert.equal(error, undefined);
    assert.equal((result.result || result).id, record.id);
  }
  assert.equal(sends, 4);
  assert.equal((await store.messages()).length, 4);
});
