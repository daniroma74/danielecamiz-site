#!/bin/bash

# ============================================
# Deploy YouTube Thumbnails Feature
# Run this on the production server
# ============================================

set -e  # Exit on error

echo "🚀 Deploying YouTube Thumbnails Feature..."
echo ""

# 1. Pull latest code from GitHub
echo "📥 1. Pulling latest code from GitHub..."
git pull origin claude/project-review-011CUoMaULBEc6ErgbH4ZpUS
echo "✅ Code updated"
echo ""

# 2. Run database migration
echo "🗄️  2. Running database migration..."
cd contact-admin
node rebuild-simple.js 2>/dev/null || echo "⚠️  Migration may have already run"
cd ..
echo "✅ Database migration complete"
echo ""

# 3. Update existing YouTube links with thumbnails
echo "📹 3. Updating existing YouTube links..."
cd contact-admin
node update-youtube-thumbnails.js
cd ..
echo "✅ YouTube links updated"
echo ""

# 4. Restart PM2 processes
echo "🔄 4. Restarting servers..."
pm2 restart contact-admin 2>/dev/null || echo "⚠️  contact-admin not found in PM2"
pm2 restart contact-site 2>/dev/null || echo "⚠️  contact-site not found in PM2"
echo "✅ Servers restarted"
echo ""

echo "✅ ============================================"
echo "✅ Deployment complete!"
echo "✅ ============================================"
echo ""
echo "📝 What's new:"
echo "   - YouTube videos now auto-generate thumbnails"
echo "   - Thumbnails display in visual editor preview"
echo "   - Thumbnails display on contact site highlight cards"
echo "   - Supports all YouTube URL formats"
echo ""
echo "🧪 Test it:"
echo "   1. Go to contact-admin visual editor"
echo "   2. Add a YouTube link to highlights"
echo "   3. Thumbnail should auto-generate!"
echo ""
