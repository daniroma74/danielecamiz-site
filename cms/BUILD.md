# Build & Minification Guide

## Overview
This project uses minification to reduce CSS and JS file sizes for better performance.

## Quick Start

### Full Production Build
```bash
cd cms
npm run build:prod
```

This will:
1. Minify all CSS files → `frontend/css-dist/`
2. Minify all JS files → `frontend/js-dist/`

### Individual Commands

**CSS Only:**
```bash
npm run build:css
```

**JS Only:**
```bash
npm run build:js
```

## Results

Typical compression rates:
- **CSS**: ~30-50% reduction
- **JS**: ~40-60% reduction

Example:
- `base.css`: 4,323 bytes → 2,997 bytes (30% smaller)
- `navbar.js`: 1,433 bytes → 750 bytes (47% smaller)

## Tools Used

- **CSS Minifier**: [csso-cli](https://www.npmjs.com/package/csso-cli)
- **JS Minifier**: [terser](https://www.npmjs.com/package/terser)

## Using Minified Assets in Production

### Option 1: Manual Swap (Current)
After building, manually update your static file paths:
```html
<!-- Before -->
<link rel="stylesheet" href="/css/base/base.css">

<!-- After -->
<link rel="stylesheet" href="/css-dist/base.css">
```

### Option 2: Environment-Based (Recommended)
In `templateServer.js`, serve from different folders based on `NODE_ENV`:
```javascript
if (process.env.NODE_ENV === 'production') {
  app.use('/css', express.static(path.join(__dirname, '..', 'frontend', 'css-dist')));
  app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'js-dist')));
} else {
  app.use('/css', express.static(path.join(__dirname, '..', 'frontend', 'css')));
  app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'js')));
}
```

## Troubleshooting

### "Some files copied without minification"
This warning means some JS files had syntax errors and were copied as-is. Common causes:
- Trailing commas in old browsers
- ES6 syntax in legacy code
- Unmatched brackets/parentheses

Check the specific file and fix syntax before re-running build.

### Build takes too long
The JS build processes all files recursively. For faster builds, consider:
1. Exclude test/demo files with `--exclude` pattern
2. Use a bundler (webpack/vite) for larger projects
3. Run builds in CI/CD only

## Next Steps

For further optimization:
1. **Bundling**: Combine multiple files into one (webpack/rollup)
2. **Tree-shaking**: Remove unused code
3. **Code splitting**: Load only what's needed per page
4. **WebP images**: Convert JPG/PNG to WebP format (see WebP task)
5. **Service Worker**: Cache assets for offline use (see PWA task)

## Performance Impact

After minification + gzip (server-side), expect:
- **First Load**: 200-400ms faster on 3G
- **Bandwidth**: 30-50% less data transfer
- **Lighthouse Score**: +5-10 points in Performance

---

**Last Updated**: 2025-11-28
