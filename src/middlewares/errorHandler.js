function errorHandler(err, req, res, next) {
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (err.name === 'ZodError' || err.errors) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors || err.message,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired',
    });
  }

  if (err.status === 401) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions',
    });
  }

  if (err.status === 404 || err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference',
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'An unexpected error occurred' : err.message,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
