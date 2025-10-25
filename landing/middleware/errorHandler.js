export function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Errore interno del server';
  
  if (req.accepts('json')) {
    return res.status(status).json({ 
      success: false, 
      error: message 
    });
  }
  
  // Assicurati che la view esista
  res.status(status).render('pages/error', { 
    status, 
    message 
  });
}