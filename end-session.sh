work-start#!/bin/bash

# Script per terminare una sessione di lavoro
# Crea commit, push e backup finale

cd "$(dirname "$0")"

# Genera timestamp
TIMESTAMP=$(date +%Y-%m-%d-%H%M)

echo "💾 Salvataggio finale sessione..."

# Verifica se ci sono modifiche
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "📦 Committando modifiche..."
    git add .
    git commit -m "backup: fine sessione $TIMESTAMP"
    echo "✅ Commit creato"
else
    echo "ℹ️  Nessuna modifica da committare"
fi

# Push al remote
echo "🚀 Push al remote..."
CURRENT_BRANCH=$(git branch --show-current)
git push -u origin "$CURRENT_BRANCH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Sessione terminata con successo!"
    echo "⏰ Timestamp: $TIMESTAMP"
    echo "📍 Branch: $CURRENT_BRANCH"
    echo "📝 Ultimo commit: $(git log -1 --oneline)"
else
    echo ""
    echo "❌ Errore durante il push!"
    echo "Verifica la connessione e riprova con: git push -u origin $CURRENT_BRANCH"
fi

echo ""
