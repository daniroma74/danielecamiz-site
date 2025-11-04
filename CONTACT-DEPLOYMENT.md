# Contact Site & Admin Deployment Guide

## Overview

The contact-site has been completely refactored with:
- ✅ New elegant glassmorphism design (Cormorant Garamond + Montserrat fonts)
- ✅ Database-driven content (SQLite) with JSON fallback
- ✅ Complete admin panel (contact-admin) for managing links
- ✅ Centralized analytics tracking via hub
- ✅ Scheduling system for links
- ✅ Badge system with custom colors
- ✅ Copy-to-clipboard for email/phone
- ✅ QR code generator
- ✅ Export functionality

## Deployment Steps

### 1. Pull Changes on Server

```bash
cd ~/danielecamiz-site
git pull origin claude/session-scripts-011CUoMaULBEc6ErgbH4ZpUS
```

### 2. Run Database Migrations

```bash
cd ~/danielecamiz-site/cms/db
sqlite3 main.sqlite < migrations/033_create_contact_tables.sql
sqlite3 main.sqlite < migrations/034_seed_contact_data.sql
```

**Verify migrations:**
```bash
sqlite3 main.sqlite "SELECT COUNT(*) FROM contact_links;"
# Should show 13 links
```

### 3. Install Dependencies

**Contact-Site:**
```bash
cd ~/danielecamiz-site/contact-site
npm install
# This will install better-sqlite3
```

**Contact-Admin:**
```bash
cd ~/danielecamiz-site/contact-admin
npm install
```

### 4. Configure Environment Variables

Run the setup script to generate .env files:
```bash
cd ~/danielecamiz-site
./setup-env.sh
```

Or manually create `.env` files:

**contact-site/.env:**
```bash
PORT=4003
NODE_ENV=production
DB_PATH=/home/daniele/danielecamiz-site/cms/db/main.sqlite
HUB_ANALYTICS_URL=https://hub.danielecamiz.com/api/analytics/track
```

**contact-admin/.env:**
```bash
CONTACT_ADMIN_PORT=3014
CONTACT_ADMIN_USER=admin
CONTACT_ADMIN_PASS=DanieleCamiz2025!
MAIN_SQLITE_PATH=/home/daniele/danielecamiz-site/cms/db/main.sqlite
ADMIN_HUB_URL=https://hub.danielecamiz.com
JWT_SECRET=<same_as_hub>
SESSION_SECRET=<random_secret>
CONTACT_SITE_URL=https://contact.danielecamiz.com
SITE_BASE_URL=https://staging.danielecamiz.com
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud>
CLOUDINARY_API_KEY=<your_cloudinary_key>
CLOUDINARY_API_SECRET=<your_cloudinary_secret>
```

### 5. Configure PM2

**Add contact-admin to PM2:**
```bash
cd ~/danielecamiz-site/contact-admin
pm2 start ecosystem.config.cjs
pm2 save
```

**Restart contact-site:**
```bash
pm2 restart contact-site
```

**Verify services:**
```bash
pm2 status
# Should show contact-site on port 4003 and contact-admin on port 3014
```

### 6. Configure Nginx

**Add contact-admin subdomain:**
```nginx
# /etc/nginx/sites-available/contact-admin.danielecamiz.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name contact-admin.danielecamiz.com;

    ssl_certificate /etc/ssl/certs/danielecamiz.com.pem;
    ssl_certificate_key /etc/ssl/private/danielecamiz.com-key.pem;

    location / {
        proxy_pass http://localhost:3014;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name contact-admin.danielecamiz.com;
    return 301 https://$server_name$request_uri;
}
```

**Enable and reload:**
```bash
sudo ln -s /etc/nginx/sites-available/contact-admin.danielecamiz.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configure DNS (Cloudflare)

Add DNS record for contact-admin:
- Type: A
- Name: contact-admin
- Content: 116.203.79.66
- Proxy status: Proxied (orange cloud)
- TTL: Auto

### 8. Test Everything

**Test contact-site:**
```bash
curl http://localhost:4003
# Should return the new HTML with glassmorphism design
```

**Test contact-admin:**
```bash
curl http://localhost:3014/auth/login
# Should return login page
```

**Test analytics tracking:**
```bash
curl -X POST http://localhost:3100/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"module":"contact-site","type":"test","category":"test","label":"test"}'
# Should return {"success":true}
```

**Access URLs:**
- Contact Site: https://contact.danielecamiz.com
- Contact Admin: https://contact-admin.danielecamiz.com (login with admin credentials)

## Using Contact-Admin

### Access
1. Navigate to https://contact-admin.danielecamiz.com
2. Login with credentials from .env (CONTACT_ADMIN_USER / CONTACT_ADMIN_PASS)

### Features

**Dashboard** - Overview of all links and stats

**Links Management:**
- View/Edit/Delete links by category (Highlights, Social, Contact, Extra)
- Add new links with titles (IT/EN), URL, icon
- Toggle visibility without deleting
- Reorder links with drag & drop or order field
- Schedule links (start/end dates for automatic visibility)
- Add badges (NEW, LIVE, etc.) with custom colors

**Settings:**
- Edit name, role (IT/EN), bio (IT/EN)
- Change avatar URL
- Update footer text (IT/EN)

**Sections:**
- View section configuration (titles, visibility)
- Toggle section visibility

**Tools:**
- Generate QR code for contact page
- Export data to JSON
- Preview site in iframe

## Features Reference

### Scheduling System
Links can be automatically shown/hidden based on dates:
- `scheduled_start`: Link becomes visible on this date
- `scheduled_end`: Link becomes hidden after this date
- Managed via view `view_active_contact_links`

### Badge System
Add visual indicators to links:
- Badge text (e.g., "NEW", "LIVE", "SOLD OUT")
- Custom badge colors (default: gold #FFD700)
- Automatically displayed on contact-site

### Analytics Tracking
Automatically tracked events:
- `page_view`: When someone visits the contact page
- `link_click`: When someone clicks a link (tracks category and label)
- `language_change`: When language is toggled
- `copy`: When email/phone is copied to clipboard

View analytics in hub dashboard (when implemented).

### Copy-to-Clipboard
Email and phone links automatically:
- Copy to clipboard on click (instead of opening mail client)
- Show toast notification ("Copiato!" / "Copied!")
- Track copy event in analytics
- Fallback to default behavior if clipboard API unavailable

## Troubleshooting

### Contact-site not loading
```bash
pm2 logs contact-site
# Check for database connection errors
# Verify DB_PATH is correct
```

### Contact-admin login fails
```bash
# Check credentials in .env
cat contact-admin/.env | grep CONTACT_ADMIN

# Verify hub is running
pm2 status admin-hub
```

### Links not showing
```bash
# Check database
sqlite3 cms/db/main.sqlite "SELECT * FROM view_active_contact_links;"

# Check scheduled dates
# Links only show if scheduled_start <= now <= scheduled_end (if set)
```

### Analytics not tracking
```bash
# Verify hub analytics endpoint
curl http://localhost:3100/_ping

# Check browser console for fetch errors
# Check hub logs
pm2 logs admin-hub
```

## Next Steps (Optional)

1. **Analytics Dashboard in Hub**: Add UI in admin-hub to view contact-site analytics
2. **Link Click Analytics**: View which links are most popular
3. **Badge Presets**: Add common badge presets in admin (NEW, LIVE, etc.)
4. **Icon Upload**: Upload custom icons via Cloudinary instead of file path
5. **Link Categories**: Add ability to create custom categories beyond the 4 default
6. **A/B Testing**: Test different link orders/texts to optimize clicks

## Files Changed

**Contact-Site:**
- `server.js` - Added better-sqlite3 integration with JSON fallback
- `package.json` - Added better-sqlite3 dependency
- `views/contact.ejs` - Complete rewrite with analytics tracking
- `public/css/main.css` - New elegant glassmorphism design (600+ lines)

**Contact-Admin:**
- Complete new module (32 files, 1466+ lines)
- Port: 3014
- Full CRUD for links, settings, sections
- Tools: QR code, export, preview

**Database:**
- `migrations/033_create_contact_tables.sql` - Schema
- `migrations/034_seed_contact_data.sql` - Initial data

**Hub:**
- Analytics system already deployed (previous commit)

## Support

For issues or questions:
1. Check PM2 logs: `pm2 logs <module-name>`
2. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify database: `sqlite3 cms/db/main.sqlite "SELECT * FROM contact_settings;"`
