#!/bin/bash
# Script per aggiornare il server con le ultime modifiche

echo "📋 Verifico branch attuale sul server..."
cd ~/danielecamiz-site/cororaro-site
git branch --show-current

echo ""
echo "📥 Faccio checkout del branch corretto..."
git checkout claude/create-orchestra-icnt-site-011CUviyEKRqnSZwtfoNJwAh

echo ""
echo "📥 Scarico le ultime modifiche..."
git pull origin claude/create-orchestra-icnt-site-011CUviyEKRqnSZwtfoNJwAh

echo ""
echo "📦 Installo nuove dipendenze (express-ejs-layouts)..."
npm install

echo ""
echo "🔄 Riavvio PM2..."
pm2 restart cororaro-site

echo ""
echo "✅ Fatto! Controlla i log con: pm2 logs cororaro-site"
echo ""
echo "🌐 Prova ad accedere a: https://staging.cororaro.it/admin"
