const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateCompany, validateChanges } = require('../src/services/companyProfile');
const profile = { 'company.name': 'Amit Uniform', 'company.address': 'Ahmedabad', 'company.phone': '+91 98765 43210', 'company.email': 'info@example.com' };
test('company nomenclature fields are required and validated before any write', async () => {
  validateCompany(profile);
  for (const key of Object.keys(profile)) assert.throws(() => validateCompany({ ...profile, [key]: ' ' }), error => error.status === 400);
  assert.throws(() => validateCompany({ ...profile, 'company.email': 'invalid' }), /valid company email/);
  const db = { settings: { findMany: async () => Object.entries(profile).map(([key, value]) => ({ key, value: JSON.stringify(value) })) } };
  await validateChanges(db, { 'company.name': 'New Company' });
  await assert.rejects(validateChanges(db, { 'company.name': '' }), /required/);
});
test('demo company profile survives a backend process restart', () => {
  const { mkdtempSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join, resolve } = require('node:path');
  const { spawnSync } = require('node:child_process');
  const env = { ...process.env, USE_MOCK_DB: 'true', WHATSAPP_DB_PATH: join(mkdtempSync(join(tmpdir(), 'commit-company-')), 'demo.sqlite') };
  const first = spawnSync(process.execPath, ['-e', "const {prisma}=require('./src/config/database');prisma.settings.update({where:{key:'company.name'},data:{value:JSON.stringify('Restart Company')}});"], { cwd: resolve(__dirname, '..'), env, encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  const second = spawnSync(process.execPath, ['-e', "const {prisma}=require('./src/config/database');prisma.settings.findUnique({where:{key:'company.name'}}).then(row=>{if(JSON.parse(row.value)!=='Restart Company')process.exitCode=1});"], { cwd: resolve(__dirname, '..'), env, encoding: 'utf8' });
  assert.equal(second.status, 0, second.stderr);
});
