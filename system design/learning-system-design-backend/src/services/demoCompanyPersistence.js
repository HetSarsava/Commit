// Persist only company profile settings in the existing demo SQLite database.
function persistDemoCompany(prisma) {
  const { DatabaseSync } = require('node:sqlite');
  const { mkdirSync } = require('node:fs');
  const path = require('node:path');
  const filename = process.env.WHATSAPP_DB_PATH || path.resolve('data/whatsapp.sqlite');
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS company_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const mockData = require('../data/mockData');
  for (const row of db.prepare('SELECT key,value FROM company_settings').all()) {
    const existing = mockData.settings.find(s => s.key === row.key);
    if (existing) existing.value = row.value;
    else mockData.settings.push({ ...row, id: row.key, category: 'COMPANY' });
  }
  for (const method of ['update', 'create']) {
    const original = prisma.settings[method].bind(prisma.settings);
    prisma.settings[method] = async args => {
      const key = args.where?.key || args.data.key;
      if (key.startsWith('company.') || key === 'whatsapp.guidelines') db.prepare('INSERT INTO company_settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, args.data.value);
      return original(args);
    };
  }
}
module.exports = { persistDemoCompany };
