#!/bin/bash

# Script to monitor staging-site and auto-restart if needed

LOG_FILE="/home/daniele/danielecamiz-site/shared/logs/staging-monitor.log"
MAX_RESTARTS=5  # Max consecutive restarts in 1 hour

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if staging-site is running in PM2
STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="staging-site") | .pm2_env.status' 2>/dev/null)

if [ "$STATUS" != "online" ]; then
    log_message "WARNING: staging-site status is '$STATUS', attempting restart..."

    # Kill any ghost processes first
    /home/daniele/danielecamiz-site/scripts/kill-ghost-processes.sh >> "$LOG_FILE" 2>&1

    # Restart staging-site
    pm2 restart staging-site >> "$LOG_FILE" 2>&1

    # Wait a moment and check status again
    sleep 3
    NEW_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="staging-site") | .pm2_env.status' 2>/dev/null)

    if [ "$NEW_STATUS" = "online" ]; then
        log_message "SUCCESS: staging-site restarted successfully"
    else
        log_message "ERROR: staging-site restart failed, status is '$NEW_STATUS'"
    fi
else
    # Test HTTP endpoint
    HTTP_CODE=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null)

    if [ "$HTTP_CODE" = "200" ]; then
        log_message "OK: staging-site is online and responding (HTTP $HTTP_CODE)"
    else
        log_message "WARNING: staging-site is online but not responding correctly (HTTP $HTTP_CODE)"
        log_message "Attempting restart..."

        # Kill any ghost processes first
        /home/daniele/danielecamiz-site/scripts/kill-ghost-processes.sh >> "$LOG_FILE" 2>&1

        pm2 restart staging-site >> "$LOG_FILE" 2>&1
        sleep 3

        NEW_HTTP_CODE=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null)
        log_message "After restart: HTTP $NEW_HTTP_CODE"
    fi
fi
