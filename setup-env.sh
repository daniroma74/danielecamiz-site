#!/bin/bash

# =========================================
# SETUP AUTOMATICO FILE .env
# =========================================
# Questo script crea tutti i file .env necessari
# con password e secret generati automaticamente
# =========================================

set -e  # Exit on error

echo "🔧 Setup automatico file .env per danielecamiz-site"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Password configurata
ADMIN_PASSWORD="DanieleCamiz2025!"
ADMIN_USERNAME="admin"

# Funzione per generare secret casuali
generate_secret() {
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

# Funzione per generare secret base64
generate_secret_base64() {
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
}

echo -e "${BLUE}📝 Generazione secret casuali...${NC}"
SESSION_SECRET=$(generate_secret)
JWT_SECRET=$(generate_secret)
COOKIE_SECRET=$(generate_secret)
CSRF_SECRET=$(generate_secret)

echo -e "${GREEN}✅ Secret generati!${NC}"
echo ""

# =========================================
# ADMIN-HUB .env
# =========================================
echo -e "${BLUE}📝 Creazione admin-hub/.env...${NC}"

cat > admin-hub/.env << EOF
# =========================================
# ADMIN-HUB ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Security Secrets (KEEP PRIVATE!)
SESSION_SECRET=${SESSION_SECRET}
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}
CSRF_SECRET=${CSRF_SECRET}

# Server Configuration
PORT=3100
NODE_ENV=production
MAIN_DOMAIN=danielecamiz.com
HUB_DOMAIN=hub.danielecamiz.com

# Database
DB_PATH=../cms/db/main.sqlite

# Session Management
SESSION_NAME=hub_session
SESSION_TIMEOUT=3600000
SESSION_SECURE=true
SESSION_SAME_SITE=lax

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_MAX_REQUESTS=100

# 2FA Configuration
TOTP_ISSUER=danielecamiz.com
TOTP_WINDOW=2

# Logging
LOG_LEVEL=info
DB_LOG_LEVEL=info

# Maintenance
MAINTENANCE_MODE=false
EOF

echo -e "${GREEN}✅ admin-hub/.env creato!${NC}"
echo ""

# =========================================
# NEWS-ADMIN .env
# =========================================
echo -e "${BLUE}📝 Creazione news-admin/.env...${NC}"

NEWS_SESSION_SECRET=$(generate_secret)

cat > news-admin/.env << EOF
# =========================================
# NEWS-ADMIN ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Authentication (BACKUP - Hub è primario)
NEWS_ADMIN_USER=${ADMIN_USERNAME}
NEWS_ADMIN_PASS=${ADMIN_PASSWORD}
SESSION_SECRET=${NEWS_SESSION_SECRET}

# Server
PORT=3005
NODE_ENV=production

# Database
MAIN_SQLITE_PATH=../cms/db/main.sqlite

# Admin Hub Integration
ADMIN_HUB_URL=https://hub.danielecamiz.com
JWT_SECRET=${JWT_SECRET}

# Site URLs
SITE_BASE_URL=https://staging.danielecamiz.com
CONTACT_SITE_URL=https://contact.danielecamiz.com

# Cloudinary (da cms/.env se esistono)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=

# Social Media (opzionali)
# FB_SYSTEM_USER_TOKEN=
# FB_TARGET_PAGE_IDS=
# LINKEDIN_ACCESS_TOKEN=
# LINKEDIN_API_VERSION=202508
# THREADS_ACCESS_TOKEN=
# THREADS_USER_ID=
EOF

echo -e "${GREEN}✅ news-admin/.env creato!${NC}"
echo ""

# =========================================
# CONCERTS-ADMIN .env
# =========================================
echo -e "${BLUE}📝 Creazione concerts-admin/.env...${NC}"

CONCERTS_SESSION_SECRET=$(generate_secret)

cat > concerts-admin/.env << EOF
# =========================================
# CONCERTS-ADMIN ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Authentication (BACKUP - Hub è primario)
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
SESSION_SECRET=${CONCERTS_SESSION_SECRET}

# Server
PORT=3004
NODE_ENV=production

# Database
MAIN_SQLITE_PATH=../cms/db/main.sqlite

# Admin Hub Integration
ADMIN_HUB_URL=https://hub.danielecamiz.com
JWT_SECRET=${JWT_SECRET}

# Site URLs
SITE_BASE_URL=https://www.danielecamiz.com

# Cloudinary (da cms/.env se esistono)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
EOF

echo -e "${GREEN}✅ concerts-admin/.env creato!${NC}"
echo ""

# =========================================
# NEWSLETTER-SERVICE .env
# =========================================
echo -e "${BLUE}📝 Creazione newsletter-service/.env...${NC}"

NEWSLETTER_SESSION_SECRET=$(generate_secret)

cat > newsletter-service/.env << EOF
# =========================================
# NEWSLETTER-SERVICE ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Authentication (BACKUP - Hub è primario)
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
SESSION_SECRET=${NEWSLETTER_SESSION_SECRET}

# Server
NEWSLETTER_PORT=3006
NODE_ENV=production

# Database
MAIN_SQLITE_PATH=../cms/db/main.sqlite

# Admin Hub Integration
ADMIN_HUB_URL=https://hub.danielecamiz.com
JWT_SECRET=${JWT_SECRET}

# Email Configuration (configurare manualmente)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=
# SMTP_PASS=
# EMAIL_FROM=newsletter@danielecamiz.com
EOF

echo -e "${GREEN}✅ newsletter-service/.env creato!${NC}"
echo ""

# =========================================
# BIO-ADMIN .env
# =========================================
echo -e "${BLUE}📝 Creazione bio-admin/.env...${NC}"

BIO_SESSION_SECRET=$(generate_secret)

cat > bio-admin/.env << EOF
# =========================================
# BIO-ADMIN ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Authentication (BACKUP - Hub è primario)
BIO_ADMIN_USER=${ADMIN_USERNAME}
BIO_ADMIN_PASS=${ADMIN_PASSWORD}
SESSION_SECRET=${BIO_SESSION_SECRET}

# Server
BIO_ADMIN_PORT=3011
NODE_ENV=production

# Database
MAIN_SQLITE_PATH=../cms/db/main.sqlite

# Admin Hub Integration
ADMIN_HUB_URL=https://hub.danielecamiz.com
JWT_SECRET=${JWT_SECRET}

# Site URLs
SITE_BASE_URL=https://staging.danielecamiz.com

# Cloudinary (da cms/.env se esistono)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
EOF

echo -e "${GREEN}✅ bio-admin/.env creato!${NC}"
echo ""

# =========================================
# PRESS-ADMIN .env
# =========================================
echo -e "${BLUE}📝 Creazione press-admin/.env...${NC}"

PRESS_SESSION_SECRET=$(generate_secret)

cat > press-admin/.env << EOF
# =========================================
# PRESS-ADMIN ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Authentication (BACKUP - Hub è primario)
PRESS_ADMIN_USER=${ADMIN_USERNAME}
PRESS_ADMIN_PASS=${ADMIN_PASSWORD}
SESSION_SECRET=${PRESS_SESSION_SECRET}

# Server
PRESS_ADMIN_PORT=3012
NODE_ENV=production

# Database
MAIN_SQLITE_PATH=../cms/db/main.sqlite

# Admin Hub Integration
ADMIN_HUB_URL=https://hub.danielecamiz.com
JWT_SECRET=${JWT_SECRET}

# Site URLs
SITE_BASE_URL=https://staging.danielecamiz.com

# Cloudinary (da cms/.env se esistono)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
EOF

echo -e "${GREEN}✅ press-admin/.env creato!${NC}"
echo ""

# =========================================
# GALLERY-ADMIN .env
# =========================================
echo -e "${BLUE}📝 Creazione gallery-admin/.env...${NC}"

GALLERY_SESSION_SECRET=$(generate_secret)

cat > gallery-admin/.env << EOF
# =========================================
# GALLERY-ADMIN ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Authentication (BACKUP - Hub è primario)
GALLERY_ADMIN_USER=${ADMIN_USERNAME}
GALLERY_ADMIN_PASS=${ADMIN_PASSWORD}
SESSION_SECRET=${GALLERY_SESSION_SECRET}

# Server
GALLERY_ADMIN_PORT=3013
NODE_ENV=production

# Database
MAIN_SQLITE_PATH=../cms/db/main.sqlite

# Admin Hub Integration
ADMIN_HUB_URL=https://hub.danielecamiz.com
JWT_SECRET=${JWT_SECRET}

# Site URLs
SITE_BASE_URL=https://www.danielecamiz.com

# Cloudinary (da cms/.env se esistono)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
EOF

echo -e "${GREEN}✅ gallery-admin/.env creato!${NC}"
echo ""

# =========================================
# ICNT-STAGIONE .env
# =========================================
echo -e "${BLUE}📝 Creazione icnt-stagione/.env...${NC}"

cat > icnt-stagione/.env << EOF
# =========================================
# ICNT-STAGIONE ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Server
PORT=3026
NODE_ENV=production

# Database
DB_PATH=../cms/db/main.sqlite

# Site Configuration
BASE_URL=https://icnt-stagione.danielecamiz.com
SEASON_CODE=2025-26
DEFAULT_START_TIME=20:00

# Google Analytics (opzionale)
# GA_MEASUREMENT_ID=

# Event Details
DETAIL_HOST_PATTERN={slug}.danielecamiz.com
# DETAIL_MAP=slug1:url1,slug2:url2
EOF

echo -e "${GREEN}✅ icnt-stagione/.env creato!${NC}"
echo ""

# =========================================
# CONTACT-SITE .env
# =========================================
echo -e "${BLUE}📝 Creazione contact-site/.env...${NC}"

cat > contact-site/.env << EOF
# =========================================
# CONTACT-SITE ENVIRONMENT CONFIGURATION
# Generato automaticamente il $(date +%Y-%m-%d)
# =========================================

# Server
PORT=4003
NODE_ENV=production

# Database (per future integrazioni)
DB_PATH=../cms/db/main.sqlite

# Site URLs
SITE_BASE_URL=https://contact.danielecamiz.com
MAIN_SITE_URL=https://www.danielecamiz.com
EOF

echo -e "${GREEN}✅ contact-site/.env creato!${NC}"
echo ""

# =========================================
# RIEPILOGO
# =========================================
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ SETUP COMPLETATO CON SUCCESSO!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${BLUE}📋 File .env creati:${NC}"
echo "   ✅ admin-hub/.env"
echo "   ✅ news-admin/.env"
echo "   ✅ concerts-admin/.env"
echo "   ✅ newsletter-service/.env"
echo "   ✅ bio-admin/.env"
echo "   ✅ press-admin/.env"
echo "   ✅ gallery-admin/.env"
echo "   ✅ icnt-stagione/.env"
echo "   ✅ contact-site/.env"
echo ""
echo -e "${BLUE}🔐 Credenziali configurate:${NC}"
echo "   Username: ${ADMIN_USERNAME}"
echo "   Password: ${ADMIN_PASSWORD}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   1. I file .env sono in .gitignore (non verranno committati)"
echo "   2. Secret generati automaticamente per sicurezza"
echo "   3. Password di backup configurata per tutti i moduli"
echo ""
echo -e "${BLUE}🎯 Prossimi passi:${NC}"
echo "   1. Riavvia i servizi PM2:"
echo -e "      ${YELLOW}pm2 restart all${NC}"
echo ""
echo "   2. Verifica status:"
echo -e "      ${YELLOW}pm2 status${NC}"
echo ""
echo "   3. Crea utente admin su hub (se non esiste):"
echo -e "      ${YELLOW}cd admin-hub && npm run create-admin${NC}"
echo ""
echo "   4. Testa il login:"
echo "      - Hub: https://hub.danielecamiz.com"
echo "      - Username: ${ADMIN_USERNAME}"
echo "      - Password: ${ADMIN_PASSWORD}"
echo ""
echo -e "${GREEN}🎉 Configurazione completata!${NC}"
echo ""
