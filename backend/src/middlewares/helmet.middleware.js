const helmet = require('helmet');

const frontendUrl =
  process.env.FRONTEND_URL || 'http://localhost:5173';

const applyHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: [
          "'self'",
          frontendUrl,
          'https://charming-vitality-production-a757.up.railway.app'
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
};

module.exports = applyHelmet;