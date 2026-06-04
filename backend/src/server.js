require('dotenv').config();

const app = require('./app');
const prisma = require('./config/prisma');
const { startOperationalDayTransitionJob } = require('./jobs/operationalDayTransitionJob');
const { processBacklog } = require('./jobs/backlogClosureJob');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    await processBacklog();
  } catch (err) {
    console.error('Backlog closure job failed:', err.message);
  }

  startOperationalDayTransitionJob();
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