// landing/middleware/routing.js

export function routeByDomain(req, res, next) {
  const host = req.get('host') || '';
  
  // events-admin.danielecamiz.com → admin panel
  if (host.includes('events-admin.danielecamiz.com')) {
    req.isEventAdmin = true;
    req.eventSlug = null;
    return next();
  }
  
  // [slug].danielecamiz.com → landing pubblica
  const match = host.match(/^([a-z0-9-]+)\.danielecamiz\.com$/);
  if (match) {
    req.isEventAdmin = false;
    req.eventSlug = match[1];
    return next();
  }
  
  // Altro dominio o localhost
  req.isEventAdmin = false;
  req.eventSlug = null;
  next();
}