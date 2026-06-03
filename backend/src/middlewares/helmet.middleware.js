const helmet = require('helmet');

const applyHelmet = () => {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
};

module.exports = applyHelmet;