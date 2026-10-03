// Database configuration
// Use mock database by default, switch to Prisma when ready

const USE_MOCK_DB = process.env.USE_MOCK_DB !== 'false'; // Default to mock

let prisma;
let connectDB;

if (USE_MOCK_DB) {
  // Use mock in-memory database
  const { mockPrisma } = require('../data/mockDatabase');
  prisma = mockPrisma;
  require('../services/demoCompanyPersistence').persistDemoCompany(prisma);

  connectDB = async () => {
    try {
      await prisma.$connect();
      console.log('✅ Mock database connected (in-memory) - No PostgreSQL needed!');
      console.log('💡 Set USE_MOCK_DB=false in .env to use real PostgreSQL');
    } catch (error) {
      console.error('❌ Mock database connection failed:', error);
      process.exit(1);
    }
  };
} else {
  // Use real Prisma + PostgreSQL
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  connectDB = async () => {
    try {
      await prisma.$connect();
      console.log('✅ PostgreSQL database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.error('💡 Set USE_MOCK_DB=true in .env to use mock data instead');
      process.exit(1);
    }
  };
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma, connectDB };
