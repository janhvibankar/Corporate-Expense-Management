const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error in development if needed
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Stack:', err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose bad ObjectId / CastError -> 400 Bad Request
  if (err.name === 'CastError' || (err.kind === 'ObjectId')) {
    message = `Invalid ID format: '${err.value}'`;
    statusCode = 400;
  }

  // Mongoose duplicate key error (code 11000) -> 409 Conflict
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for '${field}'. A record with this value already exists.`;
    statusCode = 409;
  }

  // Mongoose validation error -> 400 Bad Request
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    statusCode = 400;
  }

  // JWT errors -> 401 Unauthorized
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please authenticate again.';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token has expired. Please log in again.';
    statusCode = 401;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
