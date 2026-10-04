function persistDemoAudit(prisma) {
  const { DatabaseSync } = require('node:sqlite');
  const path = require('node:path');
  const { mkdirSync } = require('node:fs');
  const filename = process.env.WHATSAPP_DB_PATH || path.resolve('data/whatsapp.sqlite');
  mkdirSync(path.dirname(filename), {recursive:true});
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS crm_audit (id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
  const data = require('../data/mockData');
  for (const row of db.prepare('SELECT payload FROM crm_audit').all()) {
    const log = JSON.parse(row.payload); log.createdAt = new Date(log.createdAt);
    if (!data.activityLogs.some(existing=>existing.id === log.id)) data.activityLogs.push(log);
  }
  const create = prisma.activityLog.create.bind(prisma.activityLog);
  prisma.activityLog.create = async args => {
    const id = require('node:crypto').randomUUID();
    db.prepare('INSERT INTO crm_audit VALUES (?,?)').run(id,JSON.stringify({id,...args.data}));
    return create({data:{id,...args.data}});
  };
}
module.exports = { persistDemoAudit };
