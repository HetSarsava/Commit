const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cataloguePdf } = require('../src/services/cataloguePdf');
const { SQLiteStore } = require('../src/services/whatsapp/store');
const { WhatsAppService } = require('../src/services/whatsapp/service');
const { crmContext, linkContact } = require('../src/services/whatsapp/crmContext');
test('catalogue PDF creates a real paginated file from company and product data', async () => {
  const pdf = await cataloguePdf({ name: 'Test Uniform', address: 'Ahmedabad' }, Array.from({length: 30}, (_, i) => ({ name: `Uniform ${i}`, sku: `U-${i}`, basePrice: 500 })));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.toString('latin1'), /\/Count [2-9]/);
});
test('unknown WhatsApp contact can link to existing CRM records without creating duplicates or unrelated relationships', async t => {
  const store = new SQLiteStore(':memory:'); t.after(() => store.close());
  const customer = { id: 'customer-1', companyName: 'Test customer' };
  const crm = {
    customer: { findMany: async () => [customer], findUnique: async ({where}) => where.id === customer.id ? customer : null },
    lead: { findMany: async () => [] },
    quotation: { findMany: async () => [{id:'q1', customerId: customer.id, quotationNumber:'Q1'}, {id:'q2', customerId:'other'}] },
    salesOrder: { findMany: async () => [{id:'o1', customerId: customer.id, orderNumber:'O1'}] },
    invoice: { findMany: async () => [{id:'i1', customerId: customer.id, invoiceNumber:'I1'}] },
  };
  const service = new WhatsAppService({ store, crm });
  const conversation = await service.createConversation('919876543210');
  assert.equal((await crmContext(service, conversation.id)).quotations.length, 0);
  const linked = await linkContact(service, conversation.id, 'customer:customer-1');
  assert.deepEqual(linked.quotations.map(q=>q.id), ['q1']);
  assert.equal(linked.orders[0].id, 'o1'); assert.equal(linked.invoices[0].id, 'i1');
  assert.equal((await store.conversations()).length, 1);
  await assert.rejects(linkContact(service, conversation.id, 'customer:missing'), /not found/);
  assert.equal((await store.getConversation(conversation.id)).customerId, customer.id);
});
test('catalogue and legacy write routes use the canonical roles; unauthorized roles remain denied', () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const file of ['catalogueRoutes.js','inventoryRoutes.js','proformaRoutes.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../src/routes',file),'utf8'), /'(Admin|Sales|Production|Purchase|Accountant)'/);
  }
  const { requireRole } = require('../src/middleware/auth');
  let allowed = false, denied;
  const res = { status: code => { denied = code; return res; }, json: () => {} };
  requireRole(['ADMIN','SALES'])({user:{role:'ADMIN'}},res,()=>{allowed=true;});
  assert.equal(allowed,true);
  requireRole(['ADMIN','SALES'])({user:{role:'PRODUCTION'}},res,()=>{});
  assert.equal(denied,403);
});
