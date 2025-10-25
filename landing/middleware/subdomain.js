export function extractSubdomain(req, res, next) {
  const host = req.hostname;
  const subdomain = host.split('.')[0];
  req.subdomain = subdomain;
  next();
}