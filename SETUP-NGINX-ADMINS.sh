#!/bin/bash

# Script per configurare nginx per bio-admin, gallery-admin e press-admin
# Esegui questo script con: sudo bash SETUP-NGINX-ADMINS.sh

echo "🔧 Configurazione nginx per admin panels..."

# Copia i file nginx
echo "📋 Copiando file di configurazione nginx..."
cp /tmp/bio-admin.danielecamiz.com /etc/nginx/sites-available/
cp /tmp/gallery-admin.danielecamiz.com /etc/nginx/sites-available/

# Fix press-admin porta (da 3012 a 3013)
echo "🔧 Aggiornando porta press-admin da 3012 a 3013..."
sed -i 's/proxy_pass http:\/\/localhost:3012;/proxy_pass http:\/\/localhost:3013;/' /etc/nginx/sites-available/press-admin.danielecamiz.com

# Abilita i siti
echo "✅ Abilitando siti..."
ln -sf /etc/nginx/sites-available/bio-admin.danielecamiz.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/gallery-admin.danielecamiz.com /etc/nginx/sites-enabled/

# Testa la configurazione
echo "🧪 Testando configurazione nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configurazione nginx OK"
    echo "🔄 Ricaricando nginx..."
    systemctl reload nginx
    echo "✅ Nginx ricaricato!"
    echo ""
    echo "🎉 Configurazione completata!"
    echo ""
    echo "I seguenti admin panels dovrebbero essere ora accessibili:"
    echo "  - https://bio-admin.danielecamiz.com (porta 3011)"
    echo "  - https://gallery-admin.danielecamiz.com (porta 3012)"
    echo "  - https://press-admin.danielecamiz.com (porta 3013)"
else
    echo "❌ Errore nella configurazione nginx. Controlla i log."
    exit 1
fi
