const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
process.env.USE_MOCK_DB = 'true';
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.WHATSAPP_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'commit-stages-')), 'demo.sqlite');

test('simple lead groups preserve historical stages, outcomes and edit values', async () => {
  const { leadStageGroups, getLeadStatus, getLeadStatusOptions, countLeadStage } = await import(pathToFileURL(path.resolve(__dirname, '../../learning-system-design-frontend/src/utils/leadStages.js')));
  const statuses = ['NEW', 'CONTACTED', 'REQUIREMENT', 'CATALOGUE', 'QUOTATION', 'NEGOTIATION', 'SAMPLE', 'ORDER', 'PRODUCTION', 'DISPATCH', 'COMPLETED', 'LOST'];
  assert.deepEqual(leadStageGroups.flatMap(group => group.statuses).sort(), statuses.sort());
  assert.equal(new Set(leadStageGroups.flatMap(group => group.statuses)).size, statuses.length);
  const byStatus = statuses.map(status => ({ status, _count: 2 }));
  assert.equal(leadStageGroups.reduce((sum, group) => sum + countLeadStage(group, byStatus), 0), 24);
  assert.equal(getLeadStatus('ORDER').label, 'Won');
  assert.equal(getLeadStatus('LOST').label, 'Not proceeding');
  for (const status of statuses) {
    const options = getLeadStatusOptions(status);
    assert.equal(options.length, 5);
    assert.ok(options.some(option => option.value === status));
    assert.equal(new Set(options.map(option => option.value)).size, 5);
  }
});

test('group filtering happens before pagination, honours search/ownership and retains statuses', async t => {
  const { prisma } = require('../src/config/database');
  const app = require('express')();
  app.use(require('express').json());
  app.use('/api/leads', require('../src/routes/leadRoutes'));
  app.use(require('../src/middleware/errorHandler'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const users = await prisma.user.findMany({});
  const admin = users.find(user => user.role === 'ADMIN');
  const sales = users.find(user => user.role === 'SALES');
  const prefix = 'Stage filter test ';
  for (const [index, status] of ['CONTACTED', 'REQUIREMENT', 'SAMPLE', 'ORDER', 'LOST', 'NEW'].entries()) {
    await prisma.lead.create({data: {companyName: prefix + index, contactPerson: 'Demo contact', mobile: '91987650000' + index, status, source: 'MANUAL', salesPersonId: index === 2 ? admin.id : sales.id}});
  }
  const call = async (query, user = admin) => {
    const token = require('jsonwebtoken').sign({userId: user.id}, process.env.JWT_SECRET);
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/leads?' + new URLSearchParams(query), {headers: {Authorization: 'Bearer ' + token}});
    return {status: response.status, data: await response.json()};
  };
  const query = {statuses: 'CONTACTED,REQUIREMENT,CATALOGUE,NEGOTIATION,SAMPLE', search: prefix, source: 'MANUAL', limit: 1};
  const first = await call(query);
  assert.equal(first.status, 200);
  assert.equal(first.data.leads.length, 1);
  assert.equal(first.data.pagination.total, 3);
  assert.equal(first.data.pagination.totalPages, 3);
  const all = await call({...query, limit: 20});
  assert.deepEqual(all.data.leads.map(lead => lead.status).sort(), ['CONTACTED', 'REQUIREMENT', 'SAMPLE']);
  assert.equal((await call(query, sales)).data.pagination.total, 2);
  const closed = await call({statuses: 'ORDER,PRODUCTION,DISPATCH,COMPLETED,LOST', search: prefix});
  assert.deepEqual(closed.data.leads.map(lead => lead.status).sort(), ['LOST', 'ORDER']);
  assert.equal((await call({...query, source: 'WEBSITE'})).data.pagination.total, 0);
  assert.equal((await call({status: 'NEW', search: prefix})).data.pagination.total, 1);
  for (const statuses of ['', 'UNKNOWN', 'NEW,UNKNOWN']) assert.equal((await call({statuses})).status, 400);
});
