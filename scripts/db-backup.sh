#!/bin/bash
# Database Backup Script
# Crea backup automatici del database SQLite principale

set -e

# Configurazione
DB_PATH="/home/daniele/danielecamiz-site/cms/db/main.sqlite"
BACKUP_DIR="/home/daniele/danielecamiz-site/cms/db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/main.sqlite.backup-${TIMESTAMP}"
LOG_FILE="/home/daniele/danielecamiz-site/logs/db-backup.log"

# Crea directory logs se non esiste
mkdir -p "$(dirname "$LOG_FILE")"

# Funzione di log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔄 Starting database backup..."

# Verifica che il database esista
if [ ! -f "$DB_PATH" ]; then
    log "❌ ERROR: Database not found at $DB_PATH"
    exit 1
fi

# Verifica integrità PRIMA del backup
if ! sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
    log "⚠️  WARNING: Database integrity check failed BEFORE backup!"
    log "⚠️  Creating backup anyway for disaster recovery..."
fi

# Crea il backup usando SQLite .backup (più sicuro di cp)
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"

# Verifica che il backup sia stato creato
if [ ! -f "$BACKUP_FILE" ]; then
    log "❌ ERROR: Backup file was not created"
    exit 1
fi

# Verifica integrità del backup
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup successful: $BACKUP_FILE ($BACKUP_SIZE)"

    # Conta quanti backup esistono
    BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/main.sqlite.backup-* 2>/dev/null | wc -l)
    log "📦 Total backups: $BACKUP_COUNT"
else
    log "❌ ERROR: Backup integrity check failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

log "✅ Database backup completed successfully"
