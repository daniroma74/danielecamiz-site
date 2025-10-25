// concerts-admin/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error('Concerts Admin Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Errore interno del server';
  
  res.status(status).json({
    error: true,
    message: message
  });
}

export default errorHandler;