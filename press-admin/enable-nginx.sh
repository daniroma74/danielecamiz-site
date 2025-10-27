#!/bin/bash
# Script per attivare press-admin in Nginx

echo "🔧 Configurazione Nginx per PRESS-ADMIN"
echo "========================================"

# Verifica se siamo root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Questo script deve essere eseguito con sudo"
   echo "   Esegui: sudo bash enable-nginx.sh"
   exit 1
fi

# 1. Copia configurazione
echo "📋 Copiando configurazione..."
if cp /tmp/press-admin.danielecamiz.com.conf /etc/nginx/sites-available/press-admin.danielecamiz.com; then
    echo "   ✅ Configurazione copiata"
else
    echo "   ❌ Errore durante la copia"
    exit 1
fi

# 2. Crea link simbolico
echo "🔗 Creando link simbolico..."
if [ -L /etc/nginx/sites-enabled/press-admin.danielecamiz.com ]; then
    echo "   ⚠️  Link già esistente, rimuovo..."
    rm /etc/nginx/sites-enabled/press-admin.danielecamiz.com
fi

if ln -s /etc/nginx/sites-available/press-admin.danielecamiz.com /etc/nginx/sites-enabled/press-admin.danielecamiz.com; then
    echo "   ✅ Link simbolico creato"
else
    echo "   ❌ Errore durante la creazione del link"
    exit 1
fi

# 3. Test configurazione
echo "🧪 Testando configurazione Nginx..."
if nginx -t; then
    echo "   ✅ Configurazione valida"
else
    echo "   ❌ Errore nella configurazione"
    echo "   Rimuovo il link..."
    rm /etc/nginx/sites-enabled/press-admin.danielecamiz.com
    exit 1
fi

# 4. Reload Nginx
echo "🔄 Ricaricando Nginx..."
if systemctl reload nginx; then
    echo "   ✅ Nginx ricaricato"
else
    echo "   ❌ Errore durante il reload"
    exit 1
fi

echo ""
echo "✅ PRESS-ADMIN configurato con successo!"
echo ""
echo "📍 Puoi accedere a:"
echo "   https://press-admin.danielecamiz.com"
echo ""
echo "🔐 Credenziali:"
echo "   Username: admin"
echo "   Password: DanieleCamiz2025!"
echo ""
