export function errorHandler(err, req, res, next) {
  console.error('Newsletter Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Errore interno del server';
  
  if (req.accepts('json')) {
    return res.status(status).json({ 
      success: false, 
      error: message 
    });
  }
  
  res.status(status).render('pages/error', { 
    status, 
    message 
  });
}