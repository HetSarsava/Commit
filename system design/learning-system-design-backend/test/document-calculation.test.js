const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
process.env.USE_MOCK_DB = 'true';
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.WHATSAPP_DB_PATH = path.join(require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(), 'commit-calculation-')), 'demo.sqlite');
const calculationModule = import(pathToFileURL(path.resolve(__dirname, '../../learning-system-design-frontend/src/utils/documentCalculation.js')));

test('live calculation explains line discounts, zero totals and rounded multi-item totals', async () => {
  const { calculateDocument } = await calculationModule;
  const form = {items: [{description: 'Shirts', quantity: 10, unitPrice: 600, discount: 600}], discountAmount: 0, taxPercent: 18};
  const preview = calculateDocument(form);
  assert.equal(preview.items[0].gross, 6000);
  assert.equal(preview.subtotal, 5400);
  assert.equal(preview.taxAmount, 972);
  assert.equal(preview.total, 6372);
  assert.deepEqual(preview.errors, []);
  assert.equal(calculateDocument({...form, items: [{quantity: 1, unitPrice: 600, discount: 600}]}).total, 0);
  assert.equal(calculateDocument({...form, discountAmount: 400}).total, 5900);
  assert.equal(calculateDocument({...form, taxPercent: 0}).total, 5400);
  for (const patch of [{quantity: 0}, {quantity: ''}, {unitPrice: NaN}, {unitPrice: -1}, {discount: 6001}]) {
    assert.ok(calculateDocument({...form, items: [{...form.items[0], ...patch}]}).errors.length);
  }
  assert.ok(calculateDocument({...form, discountAmount: 5401}).errors.length);
  assert.ok(calculateDocument({...form, taxPercent: 101}).errors.length);
});

test('live preview matches saved quotations and orders including rounding and discounts', async t => {
  const { calculateDocument } = await calculationModule;
  const { prisma } = require('../src/config/database');
  const app = require('express')();
  app.use(require('express').json());
  app.use('/api/manual', require('../src/routes/manualCRM'));
  app.use(require('../src/middleware/errorHandler'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const admin = (await prisma.user.findMany({})).find(user => user.role === 'ADMIN');
  const token = require('jsonwebtoken').sign({userId: admin.id}, process.env.JWT_SECRET);
  const customerId = (await prisma.customer.findMany({}))[0].id;
  const forms = [
    {items: [{description: 'Shirts', quantity: 10, unitPrice: 600, discount: 600}], discountAmount: 0, taxPercent: 18},
    {items: [{description: 'Free example', quantity: 1, unitPrice: 600, discount: 600}], discountAmount: 0, taxPercent: 18},
    {items: [{description: 'A', quantity: 3, unitPrice: 19.99, discount: 0.01}, {description: 'B', quantity: 1.25, unitPrice: 12.35, discount: 0.02}], discountAmount: 0.38, taxPercent: 18},
    {items: [{description: 'C', quantity: 2, unitPrice: 1.005}], discountAmount: 0, taxPercent: 5},
    // Historical/API inputs may have more precision than the editor's 0.01 step.
    {items: [{description: 'Precision case', quantity: 1, unitPrice: 1}], discountAmount: 0.014, taxPercent: 50},
  ];
  for (const kind of ['quotations', 'orders']) for (const form of forms) {
    const preview = calculateDocument(form);
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/manual/' + kind, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, body: JSON.stringify({...form, customerId})});
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    const saved = body[kind === 'orders' ? 'order' : 'quotation'];
    for (const key of ['subtotal', 'discountAmount', 'taxAmount', 'total']) assert.equal(saved[key], preview[key], key);
    assert.deepEqual(saved.items.map(item => item.total), preview.items.map(item => item.total));
  }
});
