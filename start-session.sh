#!/bin/bash

# Script per iniziare una sessione di lavoro
# Crea un commit di backup con timestamp

cd "$(dirname "$0")"

# Genera timestamp nel formato YYYY-MM-DD-HHMM
TIMESTAMP=$(date +%Y-%m-%d-%H%M)

# Verifica se ci sono modifiche da committare
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "📦 Trovate modifiche locali, creo commit di backup..."
    git add .
    git commit -m "backup: inizio sessione $TIMESTAMP"
    echo "✅ Commit creato: backup: inizio sessione $TIMESTAMP"
else
    echo "✅ Working tree pulito, nessun backup necessario"
fi

# Pull delle modifiche remote
echo "🔄 Sincronizzazione con remote..."
git pull origin main

echo ""
echo "🚀 Sessione iniziata: $TIMESTAMP"
echo "📍 Branch: $(git branch --show-current)"
echo "📝 Ultimo commit: $(git log -1 --oneline)"
echo ""
