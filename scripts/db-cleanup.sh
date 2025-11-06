#!/bin/bash
# Database Backup Cleanup Script
# Rimuove backup più vecchi di N giorni, mantenendo sempre alcuni backup recenti

set -e

# Configurazione
BACKUP_DIR="/home/daniele/danielecamiz-site/cms/db"
RETENTION_DAYS=7  # Mantieni backup degli ultimi 7 giorni
MIN_BACKUPS_KEEP=5  # Mantieni SEMPRE almeno 5 backup recenti
LOG_FILE="/home/daniele/danielecamiz-site/logs/db-cleanup.log"

# Crea directory logs se non esiste
mkdir -p "$(dirname "$LOG_FILE")"

# Funzione di log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🧹 Starting backup cleanup..."

# Conta backup totali
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "main.sqlite.backup-*" -type f | wc -l)
log "📊 Total backups found: $TOTAL_BACKUPS"

if [ "$TOTAL_BACKUPS" -le "$MIN_BACKUPS_KEEP" ]; then
    log "ℹ️  Less than $MIN_BACKUPS_KEEP backups. Skipping cleanup for safety."
    exit 0
fi

# Trova backup da eliminare (più vecchi di RETENTION_DAYS)
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "main.sqlite.backup-*" -type f -mtime +${RETENTION_DAYS})
OLD_COUNT=$(echo "$OLD_BACKUPS" | grep -v '^$' | wc -l)

if [ "$OLD_COUNT" -eq 0 ]; then
    log "✅ No old backups to clean (all within $RETENTION_DAYS days)"
    exit 0
fi

# Calcola quanti backup rimarrebbero dopo la pulizia
REMAINING=$((TOTAL_BACKUPS - OLD_COUNT))

if [ "$REMAINING" -lt "$MIN_BACKUPS_KEEP" ]; then
    log "⚠️  Cleanup would leave only $REMAINING backups (minimum: $MIN_BACKUPS_KEEP)"
    log "ℹ️  Keeping oldest backups for safety"
    exit 0
fi

# Elimina i backup vecchi
DELETED=0
FREED_SPACE=0

while IFS= read -r backup_file; do
    if [ -n "$backup_file" ] && [ -f "$backup_file" ]; then
        SIZE=$(du -b "$backup_file" | cut -f1)
        FREED_SPACE=$((FREED_SPACE + SIZE))
        rm -f "$backup_file"
        DELETED=$((DELETED + 1))
        log "🗑️  Deleted: $(basename "$backup_file")"
    fi
done <<< "$OLD_BACKUPS"

FREED_MB=$((FREED_SPACE / 1024 / 1024))
log "✅ Cleanup completed: $DELETED backups removed, ${FREED_MB}MB freed"
log "📦 Remaining backups: $REMAINING"
