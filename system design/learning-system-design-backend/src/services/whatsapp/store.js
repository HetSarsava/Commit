const { randomUUID } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

// The CRM's default mode has no database. Keep WhatsApp durable even in that mode.
// PostgreSQL deployments use the matching additive Prisma models instead.
class SQLiteStore {
  constructor(filename = process.env.WHATSAPP_DB_PATH || path.resolve('data/whatsapp.sqlite')) {
    const { DatabaseSync } = require('node:sqlite');
    if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, phone TEXT NOT NULL UNIQUE, record TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversationId TEXT NOT NULL REFERENCES conversations(id), messageId TEXT UNIQUE, record TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversationId);
      CREATE TABLE IF NOT EXISTS status_events (id TEXT PRIMARY KEY, messageId TEXT NOT NULL, record TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS status_events_message ON status_events(messageId);`);
    // Additive upgrade for existing demo databases; serialize concurrent starts.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.db.prepare('PRAGMA table_info(messages)').all().some(column => column.name === 'idempotencyKey')) {
        this.db.exec('ALTER TABLE messages ADD COLUMN idempotencyKey TEXT');
      }
      this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS messages_idempotency ON messages(idempotencyKey); COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    this.tail = Promise.resolve();
  }
  async transaction(fn) {
    const run = this.tail.then(async () => {
      this.db.exec('BEGIN IMMEDIATE');
      try { const result = await fn(this); this.db.exec('COMMIT'); return result; }
      catch (error) { this.db.exec('ROLLBACK'); throw error; }
    });
    this.tail = run.catch(() => {});
    return run;
  }
  async conversation(phone, info = {}) {
    const row = this.db.prepare('SELECT record FROM conversations WHERE phone=?').get(phone);
    if (row) return JSON.parse(row.record);
    const record = { id: randomUUID(), phoneNumber: phone, customerName: info.customerName || `Unknown contact +${phone}`, customerId: null, leadId: null, unreadCount: 0, lastMessage: '', lastMessageAt: new Date().toISOString(), lastInboundAt: null, ...info };
    this.db.prepare('INSERT INTO conversations VALUES (?,?,?)').run(record.id, phone, JSON.stringify(record));
    return record;
  }
  async getConversation(id) {
    const row = this.db.prepare('SELECT record FROM conversations WHERE id=?').get(id);
    return row ? JSON.parse(row.record) : null;
  }
  async updateConversation(id, patch) {
    const current = await this.getConversation(id);
    const record = { ...current, ...patch };
    this.db.prepare('UPDATE conversations SET record=? WHERE id=?').run(JSON.stringify(record), id);
    return record;
  }
  async conversations() {
    return this.db.prepare('SELECT record FROM conversations ORDER BY json_extract(record,\'$.lastMessageAt\') DESC LIMIT 1000').all().map(r => JSON.parse(r.record));
  }
  async messages(conversationId) {
    const rows = conversationId
      ? this.db.prepare('SELECT record FROM messages WHERE conversationId=? ORDER BY json_extract(record,\'$.timestamp\') DESC, rowid DESC LIMIT 500').all(conversationId)
      : this.db.prepare('SELECT record FROM messages ORDER BY json_extract(record,\'$.timestamp\') DESC, rowid DESC LIMIT 1000').all();
    return rows.map(r => JSON.parse(r.record)).reverse();
  }
  async getMessage(messageId) {
    const row = this.db.prepare('SELECT record FROM messages WHERE messageId=?').get(messageId);
    return row ? JSON.parse(row.record) : null;
  }
  async createMessage(data) {
    const record = { id: randomUUID(), messageId: null, timestamp: new Date().toISOString(), statusAt: null, failure: null, metadata: null, sentBy: null, relatedId: null, messageType: 'TEXT', ...data };
    this.db.prepare('INSERT INTO messages (id,conversationId,messageId,record,idempotencyKey) VALUES (?,?,?,?,?)').run(record.id, record.conversationId, record.messageId, JSON.stringify(record), record.idempotencyKey || null);
    return record;
  }
  async updateMessage(id, patch) {
    const row = this.db.prepare('SELECT record FROM messages WHERE id=?').get(id);
    const record = { ...JSON.parse(row.record), ...patch };
    this.db.prepare('UPDATE messages SET messageId=?,record=? WHERE id=?').run(record.messageId, JSON.stringify(record), id);
    return record;
  }
  async getRequest(idempotencyKey) {
    const row = this.db.prepare('SELECT record FROM messages WHERE idempotencyKey=?').get(idempotencyKey);
    return row ? JSON.parse(row.record) : null;
  }
  async event(data) {
    const result = this.db.prepare('INSERT OR IGNORE INTO status_events VALUES (?,?,?)').run(data.id, data.messageId, JSON.stringify(data));
    return result.changes > 0;
  }
  async events(messageId) {
    return this.db.prepare('SELECT record FROM status_events WHERE messageId=?').all(messageId).map(r => JSON.parse(r.record));
  }
  close() { this.db.close(); }
}

class PrismaStore {
  constructor(client) { this.client = client; }
  jsonData(data) {
    const { Prisma } = require('@prisma/client');
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, ['failure', 'metadata'].includes(key) && value === null ? Prisma.DbNull : value]));
  }
  async transaction(fn) {
    for (let attempt = 0; ; attempt++) {
      try { return await this.client.$transaction(tx => fn(new PrismaStore(tx)), { isolationLevel: 'Serializable' }); }
      catch (error) { if (attempt >= 2 || !['P2034', 'P2002'].includes(error.code)) throw error; }
    }
  }
  async conversation(phoneNumber, info = {}) {
    return this.client.whatsappConversation.upsert({ where: { phoneNumber }, update: {}, create: { phoneNumber, customerName: `Unknown contact +${phoneNumber}`, ...info } });
  }
  async getConversation(id) { return this.client.whatsappConversation.findUnique({ where: { id } }); }
  async updateConversation(id, data) { return this.client.whatsappConversation.update({ where: { id }, data }); }
  async conversations() { return this.client.whatsappConversation.findMany({ orderBy: { lastMessageAt: 'desc' }, take: 1000 }); }
  async messages(conversationId) {
    const rows = await this.client.whatsappMessage.findMany({ where: conversationId ? { conversationId } : {}, orderBy: [{ timestamp: 'desc' }, { id: 'desc' }], take: conversationId ? 500 : 1000 });
    return rows.reverse();
  }
  async getMessage(messageId) { return this.client.whatsappMessage.findUnique({ where: { messageId } }); }
  async getRequest(idempotencyKey) { return this.client.whatsappMessage.findUnique({ where: { idempotencyKey } }); }
  async createMessage(data) { return this.client.whatsappMessage.create({ data: this.jsonData(data) }); }
  async updateMessage(id, data) { return this.client.whatsappMessage.update({ where: { id }, data: this.jsonData(data) }); }
  async event(data) {
    // skipDuplicates handles redelivery without aborting the PostgreSQL transaction.
    return (await this.client.whatsappStatusEvent.createMany({ data: this.jsonData(data), skipDuplicates: true })).count > 0;
  }
  async events(messageId) { return this.client.whatsappStatusEvent.findMany({ where: { messageId }, orderBy: { timestamp: 'asc' } }); }
}

module.exports = { SQLiteStore, PrismaStore };
