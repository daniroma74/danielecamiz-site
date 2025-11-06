#!/bin/bash
# Setup Database Protection
# Installa tutti gli script di protezione e configura crontab

set -e

echo "🛡️  Setting up database protection system..."

# Rendi eseguibili tutti gli script
chmod +x ~/danielecamiz-site/scripts/db-backup.sh
chmod +x ~/danielecamiz-site/scripts/db-cleanup.sh
chmod +x ~/danielecamiz-site/scripts/db-health-check.sh

echo "✅ Scripts made executable"

# Crea directory per i log
mkdir -p ~/danielecamiz-site/logs

echo "✅ Log directory created"

# Configura crontab
CRON_FILE="/tmp/db-protection-cron.txt"

# Salva crontab esistente
crontab -l > "$CRON_FILE" 2>/dev/null || echo "" > "$CRON_FILE"

# Rimuovi eventuali entry esistenti per evitare duplicati
sed -i '/db-backup.sh/d' "$CRON_FILE"
sed -i '/db-cleanup.sh/d' "$CRON_FILE"
sed -i '/db-health-check.sh/d' "$CRON_FILE"

# Aggiungi nuove entry
cat >> "$CRON_FILE" << 'EOF'

# Database Protection - Auto Backup ogni 6 ore
0 */6 * * * /home/daniele/danielecamiz-site/scripts/db-backup.sh >> /home/daniele/danielecamiz-site/logs/cron.log 2>&1

# Database Protection - Cleanup backup vecchi ogni giorno alle 3 AM
0 3 * * * /home/daniele/danielecamiz-site/scripts/db-cleanup.sh >> /home/daniele/danielecamiz-site/logs/cron.log 2>&1

# Database Protection - Health Check ogni ora
0 * * * * /home/daniele/danielecamiz-site/scripts/db-health-check.sh >> /home/daniele/danielecamiz-site/logs/cron.log 2>&1

EOF

# Installa il nuovo crontab
crontab "$CRON_FILE"
rm "$CRON_FILE"

echo "✅ Crontab configured"
echo ""
echo "📋 Configured jobs:"
echo "   • Backup:       Every 6 hours"
echo "   • Cleanup:      Daily at 3 AM (keep 7 days, min 5 backups)"
echo "   • Health check: Every hour"
echo ""
echo "🧪 Test the scripts manually:"
echo "   ~/danielecamiz-site/scripts/db-backup.sh"
echo "   ~/danielecamiz-site/scripts/db-health-check.sh"
echo ""
echo "📊 View logs:"
echo "   tail -f ~/danielecamiz-site/logs/db-backup.log"
echo "   tail -f ~/danielecamiz-site/logs/db-health.log"
echo ""
echo "✅ Database protection system ready!"
