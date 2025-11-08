#!/bin/bash

# Script to kill ghost processes that interfere with PM2 managed apps
# Specifically targets orphaned templateServer.js processes

LOG_FILE="/home/daniele/danielecamiz-site/shared/logs/ghost-killer.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "=== Ghost Process Killer Started ==="

# Get all PIDs managed by PM2
PM2_PIDS=$(pm2 jlist | grep -o '"pid":[0-9]*' | cut -d':' -f2 | tr '\n' '|' | sed 's/|$//')

if [ -z "$PM2_PIDS" ]; then
    log_message "WARNING: Could not get PM2 PIDs list"
    PM2_PIDS="^$"  # Empty regex that matches nothing
fi

log_message "PM2 managed PIDs: $PM2_PIDS"

# Find ghost templateServer processes (not managed by PM2)
ALL_TEMPLATE_PIDS=$(ps aux | grep -E "node.*templateServer\.js" | grep -v "grep" | awk '{print $2}')

GHOST_COUNT=0
for PID in $ALL_TEMPLATE_PIDS; do
    # Check if this PID is NOT in the PM2 managed list
    if ! echo "$PID" | grep -qE "^($PM2_PIDS)$"; then
        PROC_INFO=$(ps -p "$PID" -o pid,cmd --no-headers 2>/dev/null)

        if [ -n "$PROC_INFO" ]; then
            log_message "Found ghost process: $PROC_INFO"
            log_message "Killing ghost process PID $PID"
            kill "$PID" 2>/dev/null

            # Wait a moment and check if process is still alive
            sleep 1
            if ps -p "$PID" > /dev/null 2>&1; then
                log_message "Process $PID still alive, using SIGKILL"
                kill -9 "$PID" 2>/dev/null
            else
                log_message "Process $PID terminated successfully"
            fi
            GHOST_COUNT=$((GHOST_COUNT + 1))
        fi
    fi
done

if [ $GHOST_COUNT -eq 0 ]; then
    log_message "No ghost templateServer processes found"
fi

# Check for other potentially problematic ghost processes
# (processes using ports that should be managed by PM2)
log_message "Checking for processes using staging ports..."

PORT_GHOST_COUNT=0
for PORT in 3001 3010 3011 3012 3013; do
    # Get PIDs using this port
    PIDS=$(lsof -ti:$PORT 2>/dev/null)

    for PID in $PIDS; do
        # Check if this PID is NOT in the PM2 managed list
        if ! echo "$PID" | grep -qE "^($PM2_PIDS)$"; then
            PROC_CMD=$(ps -p "$PID" -o cmd --no-headers 2>/dev/null)

            if [[ -n "$PROC_CMD" ]] && [[ "$PROC_CMD" =~ "node" ]]; then
                log_message "WARNING: Ghost node process on port $PORT (PID $PID): $PROC_CMD"
                # Uncomment the following lines to auto-kill these too:
                # log_message "Killing ghost process $PID on port $PORT"
                # kill "$PID" 2>/dev/null
                # sleep 1
                # if ps -p "$PID" > /dev/null 2>&1; then
                #     kill -9 "$PID" 2>/dev/null
                # fi
                PORT_GHOST_COUNT=$((PORT_GHOST_COUNT + 1))
            fi
        fi
    done
done

if [ $PORT_GHOST_COUNT -eq 0 ]; then
    log_message "No ghost processes found on staging ports"
fi

log_message "=== Ghost Process Killer Completed ==="
log_message ""
