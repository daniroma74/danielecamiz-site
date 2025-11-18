// cororaro-landing/middleware/routing.js
// Routing by domain - stesso pattern di landing/middleware/routing.js

export function routeByDomain(req, res, next) {
  const host = req.get('host') || '';

  // landing-admin.cororaro.it → admin panel
  if (host.includes('landing-admin.cororaro.it') || host.includes('localhost:3121')) {
    req.isCoroAdmin = true;
    req.concertSlug = null;
    return next();
  }

  // [slug].cororaro.it → landing pubblica (es: concerto-natale25.cororaro.it)
  const match = host.match(/^([a-z0-9-]+)\.cororaro\.it$/);
  if (match) {
    req.isCoroAdmin = false;
    req.concertSlug = match[1];
    return next();
  }

  // Altro dominio o test locale
  req.isCoroAdmin = false;
  req.concertSlug = null;
  next();
}
