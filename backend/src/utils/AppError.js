class AppError extends Error {
  constructor(message, status, type) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.type = type;
  }
}

module.exports = AppError;
