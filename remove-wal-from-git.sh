#!/bin/bash
# Remove SQLite WAL files from Git history
# These files should never be committed (already in .gitignore)

echo "🧹 Removing SQLite WAL files from Git..."

# Remove from Git index but keep local files
git rm --cached cms/db/*.sqlite-shm 2>/dev/null || echo "No .shm files to remove"
git rm --cached cms/db/*.sqlite-wal 2>/dev/null || echo "No .wal files to remove"
git rm --cached cms/db/*.sqlite 2>/dev/null || echo "No .sqlite files to remove"

echo ""
echo "✅ Files removed from Git index"
echo ""
echo "Next steps:"
echo "1. git commit -m 'chore: remove SQLite files from repository'"
echo "2. git push"
echo ""
echo "Note: Local database files are still safe on disk!"
