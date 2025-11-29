# Quick Start - Performance Optimization Guide

## 🚀 Build & Deploy Checklist

### Before Each Production Deploy

```bash
cd /home/daniele/danielecamiz-site/cms

# 1. Build minified assets
npm run build:prod

# 2. Restart production service
NODE_ENV=production pm2 restart cms-site

# 3. Verify deployment
curl -I https://danielecamiz.com/
```

---

## 📸 Adding New Images

### For Local Images (hero, etc.)

```bash
cd /home/daniele/danielecamiz-site/cms

# Convert new images to WebP
npm run build:images

# Or dry-run to preview
npm run build:images:dry
```

### For Cloudinary Images

No action needed - `f_auto` parameter automatically serves WebP to modern browsers.

---

## 🔧 Quick Verification Commands

```bash
# Check all pages are working
for page in "/" "/bio" "/gallery" "/press" "/news" "/concerts"; do
  echo -n "$page: "
  curl -s -o /dev/null -w "%{http_code}" "https://danielecamiz.com$page"
  echo ""
done

# Check Service Worker
curl -I https://danielecamiz.com/service-worker.js

# Check Brotli compression
curl -H "Accept-Encoding: br" -I https://danielecamiz.com/ | grep content-encoding

# Check CSS minification
curl -s https://danielecamiz.com/css/base/base.css | head -1 | wc -c
```

---

## 📊 Performance Testing

### Online Tools
- **PageSpeed Insights**: https://pagespeed.web.dev/analysis?url=https://danielecamiz.com
- **GTmetrix**: https://gtmetrix.com/
- **WebPageTest**: https://www.webpagetest.org/

### Target Scores
- Performance: 88-92%
- PWA: 85-90%
- Best Practices: 95%
- Accessibility: 95%
- SEO: 95%

---

## 🛠️ Troubleshooting

### Assets not minified in production?

```bash
# Check NODE_ENV
NODE_ENV=production pm2 restart cms-site

# Verify environment
pm2 env cms-site | grep NODE_ENV
```

### Service Worker not loading?

```bash
# Check file exists and is accessible
curl -I https://danielecamiz.com/service-worker.js

# Should return 200 OK
```

### Images not showing as WebP?

```bash
# Check browser DevTools Network tab
# Modern browsers should receive .webp files
# Legacy browsers should receive .jpg/.png fallback
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `cms/package.json` | Build scripts (build:css, build:js, build:images) |
| `cms/templateServer.js` | Environment-based asset serving |
| `frontend/service-worker.js` | Service Worker config |
| `cms/scripts/convert-to-webp.js` | Image conversion script |

---

## 🔄 Service Worker Updates

When deploying significant changes:

```bash
# 1. Update cache version in service-worker.js
# Change: const CACHE_VERSION = 'v1.0.0'; to v1.0.1 etc.

# 2. Rebuild and restart
npm run build:prod
NODE_ENV=production pm2 restart cms-site
```

---

## 📈 Monitoring

### PM2 Logs
```bash
# View logs
pm2 logs cms-site

# View errors only
pm2 logs cms-site --err
```

### Check Service Status
```bash
pm2 list
pm2 info cms-site
```

---

## 🎯 Quick Wins for Future

1. **Critical CSS**: Inline critical CSS for faster First Contentful Paint
2. **Lazy Loading**: Verify all non-hero images have `loading="lazy"`
3. **Resource Hints**: Add `<link rel="preload">` for critical resources
4. **Code Splitting**: Split large JS bundles by route

---

**Last Updated**: 29 November 2025  
**Optimizations Active**: WebP, Minification, Service Worker, Brotli
