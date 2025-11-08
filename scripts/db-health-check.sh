#!/bin/bash
# Database Health Check Script
# Verifica l'integrità del database e invia alert se necessario

set -e

# Configurazione
DB_PATH="/home/daniele/danielecamiz-site/cms/db/main.sqlite"
LOG_FILE="/home/daniele/danielecamiz-site/logs/db-health.log"
ALERT_EMAIL="daniele@danielecamiz.com"  # MODIFICA CON LA TUA EMAIL
ENABLE_EMAIL_ALERTS=false  # Imposta a true per abilitare email

# Crea directory logs se non esiste
mkdir -p "$(dirname "$LOG_FILE")"

# Funzione di log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Funzione per inviare alert
send_alert() {
    local subject="$1"
    local message="$2"

    log "🚨 ALERT: $subject"
    log "$message"

    if [ "$ENABLE_EMAIL_ALERTS" = true ]; then
        echo "$message" | mail -s "[DB ALERT] $subject" "$ALERT_EMAIL" 2>/dev/null || \
            log "⚠️  Failed to send email alert"
    fi
}

log "🔍 Starting database health check..."

# Verifica che il database esista
if [ ! -f "$DB_PATH" ]; then
    send_alert "Database Not Found" "Database file missing at: $DB_PATH"
    exit 1
fi

# Controlla dimensione del database
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
log "📊 Database size: $DB_SIZE"

# Verifica integrità del database
INTEGRITY_CHECK=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1)

if echo "$INTEGRITY_CHECK" | grep -q "ok"; then
    log "✅ Database integrity: OK"
else
    send_alert "Database Corruption Detected" \
        "Integrity check failed!\nDetails: $INTEGRITY_CHECK\n\nPlease restore from latest backup immediately!"
    exit 1
fi

# Controlla file WAL e SHM
WAL_FILE="${DB_PATH}-wal"
SHM_FILE="${DB_PATH}-shm"

if [ -f "$WAL_FILE" ]; then
    WAL_SIZE=$(du -h "$WAL_FILE" | cut -f1)
    log "📄 WAL file size: $WAL_SIZE"

    # Se WAL è troppo grande, potrebbe indicare un problema
    WAL_BYTES=$(du -b "$WAL_FILE" | cut -f1)
    if [ "$WAL_BYTES" -gt 10485760 ]; then  # > 10MB
        log "⚠️  WARNING: WAL file is large (${WAL_SIZE}). Consider checkpoint."
        # Esegui checkpoint per consolidare il WAL
        sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
    fi
fi

# Verifica numero di tabelle
TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>&1)
if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    log "📋 Tables count: $TABLE_COUNT"
else
    send_alert "Database Structure Error" "Failed to count tables in database"
    exit 1
fi

# Verifica tabelle critiche
CRITICAL_TABLES=("concerts" "users" "sessions")
for table in "${CRITICAL_TABLES[@]}"; do
    if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" | grep -q "$table"; then
        ROW_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;" 2>&1)
        log "✅ Table '$table': $ROW_COUNT rows"
    else
        log "⚠️  Table '$table' not found (might be optional)"
    fi
done

# Controlla l'ultimo backup
LATEST_BACKUP=$(ls -t /home/daniele/danielecamiz-site/cms/db/main.sqlite.backup-* 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
    log "📦 Latest backup: $(basename "$LATEST_BACKUP") (${BACKUP_AGE}h ago)"

    if [ "$BACKUP_AGE" -gt 12 ]; then
        log "⚠️  WARNING: Latest backup is older than 12 hours"
    fi
else
    log "⚠️  WARNING: No backups found!"
fi

# Controlla spazio disco
DISK_USAGE=$(df -h /home/daniele/danielecamiz-site | awk 'NR==2 {print $5}' | sed 's/%//')
log "💾 Disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 90 ]; then
    send_alert "Low Disk Space" "Disk usage is at ${DISK_USAGE}%. Please free up space."
fi

log "✅ Health check completed successfully"
