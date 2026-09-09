require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();

const app = require('./app');
const prisma = require('./config/prisma');
const { startClosureScheduler } = require('./services/closureScheduler');
const { startBackupScheduler } = require('./services/backupScheduler');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  server.timeout = 60000;
  startClosureScheduler();
  startBackupScheduler();
});

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
  });
  await prisma.$disconnect();
  console.log('Database connections closed.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
