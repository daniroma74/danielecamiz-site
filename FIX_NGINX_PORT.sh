#!/bin/bash
# Script per correggere il problema nginx proxy port
# Eseguire con: bash FIX_NGINX_PORT.sh

echo "================================================"
echo "FIX NGINX PROXY PORT - danielecamiz.com"
echo "================================================"
echo ""
echo "Problema: Nginx fa proxy a localhost:3000 (coming-soon, NON attiva)"
echo "Soluzione: Cambiare a localhost:3001 (cms-site, attiva)"
echo ""

# 1. Backup configurazione
echo "[1/4] Creando backup configurazione nginx..."
sudo cp /etc/nginx/sites-available/danielecamiz.conf /etc/nginx/sites-available/danielecamiz.conf.backup-$(date +%Y%m%d-%H%M%S)
if [ $? -eq 0 ]; then
    echo "✅ Backup creato"
else
    echo "❌ Errore nel backup!"
    exit 1
fi

# 2. Modifica configurazione
echo ""
echo "[2/4] Modificando configurazione nginx..."
sudo sed -i 's/proxy_pass http:\/\/localhost:3000;/proxy_pass http:\/\/localhost:3001;/g' /etc/nginx/sites-available/danielecamiz.conf
if [ $? -eq 0 ]; then
    echo "✅ Configurazione modificata"
else
    echo "❌ Errore nella modifica!"
    exit 1
fi

# 3. Test configurazione
echo ""
echo "[3/4] Testando configurazione nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Configurazione valida"
else
    echo "❌ Configurazione non valida! Ripristino backup..."
    sudo cp /etc/nginx/sites-available/danielecamiz.conf.backup-$(date +%Y%m%d)* /etc/nginx/sites-available/danielecamiz.conf
    exit 1
fi

# 4. Reload nginx
echo ""
echo "[4/4] Ricaricando nginx..."
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx ricaricato"
else
    echo "❌ Errore nel reload!"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ FIX COMPLETATO!"
echo "================================================"
echo ""
echo "Verifica che tutto funzioni:"
echo ""
echo "curl -I https://www.danielecamiz.com/bio"
echo "curl -I https://www.danielecamiz.com/gallery"
echo "curl -I https://www.danielecamiz.com/press"
echo ""
echo "Tutte dovrebbero rispondere 200 OK"
echo ""
