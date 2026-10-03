const { prisma } = require('../../config/database');
const { SQLiteStore, PrismaStore } = require('./store');
const { WhatsAppService } = require('./service');

const store = process.env.USE_MOCK_DB === 'false' ? new PrismaStore(prisma) : new SQLiteStore();
const service = new WhatsAppService({ store, crm: prisma });
module.exports = { service, store };
