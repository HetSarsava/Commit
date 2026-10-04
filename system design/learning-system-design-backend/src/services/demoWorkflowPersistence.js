// Persist the demo workflows touched by this repair without modifying production data.
function persistDemoWorkflows(prisma) {
  const { DatabaseSync } = require('node:sqlite');
  const path = require('node:path');
  const filename = process.env.WHATSAPP_DB_PATH || path.resolve('data/whatsapp.sqlite');
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS crm_workflows (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)');
  const data = require('../data/mockData');
  const keys = ['products','catalogues','catalogueItems','catalogueAnalytics','orders','orderItems','invoices','invoiceItems','campaigns','proformaInvoices','proformaItems'];
  const stored = db.prepare('SELECT payload FROM crm_workflows WHERE id=1').get();
  if (stored) for (const [key,rows] of Object.entries(JSON.parse(stored.payload))) if (keys.includes(key)) data[key] = rows.map(row => Object.fromEntries(Object.entries(row).map(([field,value])=>[field, /At$|Date$/.test(field) && typeof value==='string' ? new Date(value) : value])));
  const save = () => db.prepare('INSERT INTO crm_workflows VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(JSON.stringify(Object.fromEntries(keys.filter(key=>Array.isArray(data[key])).map(key=>[key,data[key]]))));
  for (const model of ['product','catalogue','catalogueItem','catalogueAnalytics','order','orderItem','invoice','invoiceItem','campaign','proformaInvoice','proformaItem']) {
    for (const method of ['create','update','delete','deleteMany']) if (prisma[model]?.[method]) {
      const original = prisma[model][method].bind(prisma[model]);
      prisma[model][method] = async args => { const result = await original(args); save(); return result; };
    }
  }
}
module.exports = { persistDemoWorkflows };
