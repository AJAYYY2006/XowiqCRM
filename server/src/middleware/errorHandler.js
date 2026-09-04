export function errorHandler(err, req, res, next) {
  console.error('❌ [API Error]:', err.stack || err.message)

  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  })
}
