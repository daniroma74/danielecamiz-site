#!/bin/bash
# Script per trovare dove sono davvero i dati della newsletter

echo "=== RICERCA DATABASE NEWSLETTER ==="
echo ""

# 1. Trova tutti i file .db, .sqlite, .sqlite3
echo "📁 DATABASE TROVATI:"
find ~/danielecamiz-site -type f \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" \) 2>/dev/null | while read db; do
    echo ""
    echo "File: $db"
    echo "Dimensione: $(du -h "$db" | cut -f1)"
    echo "Tabelle:"
    sqlite3 "$db" ".tables" 2>/dev/null | head -3
done

echo ""
echo "=== VERIFICA TABELLE IN main.sqlite ==="
DB="/home/daniele/danielecamiz-site/cms/db/main.sqlite"
echo "Database: $DB"
echo ""

echo "📋 TUTTE LE TABELLE:"
sqlite3 "$DB" ".tables"

echo ""
echo "�� TABELLE CHE POTREBBERO ESSERE NEWSLETTER:"
sqlite3 "$DB" ".tables" | tr ' ' '\n' | grep -E -i "(mail|news|campaign|subscriber|newsletter|mailing|contact)"

echo ""
echo "📧 STRUTTURA TABELLA campaigns:"
sqlite3 "$DB" ".schema campaigns"

echo ""
echo "📊 DATI IN campaigns:"
sqlite3 "$DB" "SELECT * FROM campaigns ORDER BY id DESC LIMIT 3;"

echo ""
echo "=== VERIFICA FILE DI CONFIG ==="
echo "🔧 File .env:"
if [ -f ~/danielecamiz-site/newsletter-service/.env ]; then
    grep -E "(DB|DATABASE|SQLITE)" ~/danielecamiz-site/newsletter-service/.env
else
    echo "Non trovato"
fi

echo ""
echo "🔧 Config files:"
find ~/danielecamiz-site/newsletter-service -name "*.config.js" -o -name "config.js" 2>/dev/null | while read cfg; do
    echo "File: $cfg"
    grep -E "(db|database|sqlite)" "$cfg" 2>/dev/null | head -3
done
