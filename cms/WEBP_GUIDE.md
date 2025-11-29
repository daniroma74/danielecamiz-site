# WebP Images Implementation Guide

## What is WebP?
WebP is a modern image format developed by Google that provides superior compression for images on the web. It's **25-35% smaller** than JPEG and **25-50% smaller** than PNG, with identical visual quality.

## Browser Support (2025)
- ✅ Chrome/Edge: All versions
- ✅ Firefox: All versions
- ✅ Safari: 14+ (2020+)
- ✅ Mobile: iOS 14+, Android 5+

**Coverage**: ~96% of users globally

## Step 1: Convert Images

### Automatic Conversion (Recommended)

```bash
cd cms

# Dry run (see what would be converted)
node scripts/convert-to-webp.js --dry-run

# Convert all images in frontend/img
node scripts/convert-to-webp.js

# Custom directory
node scripts/convert-to-webp.js --dir /path/to/images

# Custom quality (default: 85)
node scripts/convert-to-webp.js --quality 90
```

### Manual Conversion with Sharp
```javascript
import sharp from 'sharp';

await sharp('image.jpg')
  .webp({ quality: 85 })
  .toFile('image.webp');
```

## Step 2: Update HTML

### Basic Implementation
Use the `<picture>` tag with fallback:

```html
<picture>
  <source srcset="/img/hero.webp" type="image/webp">
  <img src="/img/hero.jpg" alt="Description">
</picture>
```

### With Responsive Sizes
```html
<picture>
  <source
    srcset="/img/hero-small.webp 480w,
            /img/hero-medium.webp 768w,
            /img/hero-large.webp 1200w"
    sizes="(max-width: 768px) 100vw, 1200px"
    type="image/webp">
  <source
    srcset="/img/hero-small.jpg 480w,
            /img/hero-medium.jpg 768w,
            /img/hero-large.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 1200px">
  <img src="/img/hero-medium.jpg" alt="Hero image">
</picture>
```

### In CSS (Background Images)
CSS doesn't support `<picture>`, so use feature detection:

```css
/* Fallback for older browsers */
.hero {
  background-image: url('/img/hero.jpg');
}

/* WebP for modern browsers */
@supports (background-image: url('test.webp')) {
  .hero {
    background-image: url('/img/hero.webp');
  }
}
```

Or use JavaScript detection:
```javascript
// Add class to <html> if WebP is supported
(async () => {
  const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  const img = new Image();
  img.onload = () => document.documentElement.classList.add('webp');
  img.onerror = () => document.documentElement.classList.add('no-webp');
  img.src = webpData;
})();
```

```css
.webp .hero { background-image: url('/img/hero.webp'); }
.no-webp .hero { background-image: url('/img/hero.jpg'); }
```

## Step 3: Update EJS Templates

### Simple Replacement
Find all `<img>` tags and wrap them:

**Before:**
```ejs
<img src="/img/daniele-camiz.jpg" alt="Daniele Camiz">
```

**After:**
```ejs
<picture>
  <source srcset="/img/daniele-camiz.webp" type="image/webp">
  <img src="/img/daniele-camiz.jpg" alt="Daniele Camiz">
</picture>
```

### Create a Helper Partial
`views/partials/picture.ejs`:
```ejs
<%
  // Usage: <%- include('../partials/picture', { src: '/img/photo.jpg', alt: 'Description' }) %>
  const webpSrc = src.replace(/\.(jpe?g|png)$/i, '.webp');
%>
<picture>
  <source srcset="<%= webpSrc %>" type="image/webp">
  <img src="<%= src %>" alt="<%= alt %>" class="<%= className || '' %>">
</picture>
```

Then use it everywhere:
```ejs
<%- include('../partials/picture', {
  src: '/img/hero.jpg',
  alt: 'Hero image',
  className: 'hero-image'
}) %>
```

## Step 4: Server Configuration

### Nginx (Already Configured via Helmet)
Your CSP headers already allow images from all sources:
```nginx
img-src 'self' data: https: https://res.cloudinary.com https://i.ytimg.com;
```

### Express Static (Already Set)
Your `templateServer.js` already serves images with proper cache headers:
```javascript
app.use('/img', express.static(..., staticOptions(31536000000)));
```

## Step 5: Testing

### Visual Regression
```bash
# Before conversion
curl -s http://localhost:3001/ > before.html

# After implementing WebP
curl -s http://localhost:3001/ > after.html

# Compare image counts
grep -c '<img' before.html after.html
grep -c '<picture>' after.html
```

### Performance Testing
```bash
# Before
curl -w "%{size_download}\n" -o /dev/null -s http://localhost:3001/img/hero.jpg

# After
curl -w "%{size_download}\n" -o /dev/null -s http://localhost:3001/img/hero.webp
```

### Browser Testing
1. Chrome DevTools → Network → Filter by "Img"
2. Check "Type" column shows "webp"
3. Verify file sizes are smaller

## Performance Impact

### Expected Improvements
- **Load Time**: 20-40% faster on 3G
- **Bandwidth**: 25-35% less data
- **Lighthouse Score**: +5-15 points in Performance
- **First Contentful Paint (FCP)**: 200-500ms improvement

### Real Example
```
Before (JPEG):
  hero.jpg: 245 KB

After (WebP):
  hero.webp: 158 KB (35% smaller)
```

## Troubleshooting

### WebP Not Loading in Safari
- Check Safari version is 14+ (2020+)
- Ensure proper MIME type: `image/webp`
- Verify file isn't corrupted

### Images Look Blurry
- Increase quality: `--quality 90` or `--quality 95`
- Check source image resolution
- Use lossless WebP for critical images: `sharp().webp({ lossless: true })`

### Conversion Script Fails
```bash
# Check Sharp is installed
npm list sharp

# Reinstall if needed
npm install sharp --save

# Check file permissions
ls -la ../frontend/img/
```

## Advanced: Cloudinary WebP

If using Cloudinary (already in your stack), you can auto-convert on-the-fly:

```javascript
// Before
https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/sample.jpg

// After (auto WebP)
https://res.cloudinary.com/dnwhnz2xy/image/upload/f_auto,q_auto/v1234567890/sample.jpg
```

The `f_auto` parameter automatically serves WebP to supporting browsers!

## Recommended Workflow

1. **Development**: Keep original JPG/PNG files
2. **Build**: Run `npm run build:images` (add this script)
3. **Production**: Deploy both formats
4. **HTML**: Use `<picture>` tags with WebP + fallback
5. **Monitor**: Check analytics for format usage

## Next Steps

After implementing WebP:
1. ✅ Run Lighthouse audit
2. ✅ Check Google PageSpeed Insights
3. ✅ Monitor Core Web Vitals (LCP)
4. ✅ Consider Service Worker for caching (see PWA task)

---

**Last Updated**: 2025-11-28
**Performance Gain**: High (25-35% image size reduction)
**Implementation Time**: 2-4 hours
