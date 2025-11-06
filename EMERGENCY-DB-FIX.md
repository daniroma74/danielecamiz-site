# 🚨 EMERGENZA: Database Corrotto

## Problema Identificato

Il database SQLite è **corrotto**:

```
SqliteError: malformed database schema (highlight)
code: 'SQLITE_CORRUPT'
```

**Questo spiega tutti i problemi:**
- ❌ Toggle visibilità non funzionano
- ❌ Thumbnail non si vedono
- ❌ Dati strani o mancanti
- ❌ Comportamenti imprevedibili

---

## ⚠️ IMPORTANTE: Leggi Prima di Procedere

**Lo script di recovery:**
1. ✅ Fa backup automatico del database corrotto
2. ✅ Tenta di recuperare i tuoi dati (settings + links)
3. ✅ Ricostruisce il database da zero
4. ✅ Ripristina i dati recuperati

**Se il recovery fallisce:**
- I tuoi dati verranno persi
- Il database sarà ricreato con i dati di default

**Raccomandazione:**
- Annota manualmente nome, bio e link importanti prima di procedere
- Oppure fai uno screenshot dell'editor

---

## 🚀 Soluzione Rapida

### Sul Server di Produzione

```bash
cd ~/danielecamiz-site
git pull origin claude/project-review-011CUoMaULBEc6ErgbH4ZpUS

cd contact-admin
node emergency-rebuild-db.js

# Se tutto va bene, riavvia i servizi:
pm2 restart contact-admin contact-site
```

### Output Atteso

```
🚨 EMERGENCY DATABASE RECOVERY

Database: /path/to/cms/db/main.sqlite

✅ Backed up corrupted DB to: main.sqlite.corrupted.1234567890

🔄 Attempting to recover data from corrupted database...

✅ Recovered settings: Daniele Camiz
✅ Recovered 20 links

============================================================

✅ Deleted corrupted database

🔨 Creating fresh database...

✅ Created tables

🔄 Restoring recovered data...

✅ Restored settings
✅ Restored 20 links
✅ Created sections

============================================================
✅ DATABASE REBUILD COMPLETE!
============================================================

Settings: Daniele Camiz
Links: 20 records

Backup of corrupted DB: main.sqlite.corrupted.1234567890

⚠️  Please restart PM2 services now:

    pm2 restart contact-admin contact-site
```

---

## 🔍 Verifica Post-Recovery

Dopo il rebuild e riavvio:

### 1. Test Persistenza
```bash
# Apri l'editor
# Modifica qualcosa
# Salva
pm2 restart contact-admin contact-site
# Ricarica pagina
# ✅ I dati devono essere ancora lì
```

### 2. Test Toggle Visibilità

1. Vai su `/editor/visual`
2. Guarda i toggle - devono riflettere lo stato reale (alcuni ON, alcuni OFF)
3. Clicca un toggle per spegnere un link
4. Clicca "Salva"
5. Vai sul sito pubblico
6. ✅ Il link deve essere sparito

### 3. Test Thumbnail YouTube

1. Aggiungi un highlight con link YouTube
2. ✅ Thumbnail deve apparire nell'anteprima
3. Salva
4. Vai sul sito
5. ✅ Thumbnail deve essere visibile

---

## 🔧 Troubleshooting

### Problema: Recovery script fallisce

**Errore: "Cannot open database"**

```bash
# Il DB è troppo corrotto per essere aperto
# Rimuovi manualmente i file e ricostruisci:

cd ~/danielecamiz-site/cms/db
rm main.sqlite main.sqlite-wal main.sqlite-shm
cd ~/danielecamiz-site/contact-admin
node emergency-rebuild-db.js
```

### Problema: Dati non recuperati

Se vedi:
```
❌ Could not recover settings
❌ Could not recover links
⚠️  No data recovered, seeding with defaults...
```

**Significa:**
- Il database era troppo corrotto
- Sono stati usati i dati di default
- Dovrai reinserire manualmente nome, bio e link

### Problema: Dopo rebuild, ancora errori

```bash
# Verifica integrità del nuovo database:
cd ~/danielecamiz-site/cms/db

# Con sqlite3 (se installato):
sqlite3 main.sqlite "PRAGMA integrity_check;"
# Output atteso: ok

# Controlla che le tabelle esistano:
sqlite3 main.sqlite ".tables"
# Deve mostrare: contact_links, contact_sections, contact_settings
```

---

## 🎯 Causa della Corruzione

**Possibili cause:**
1. **Scritture concorrenti** - PM2 con più istanze che scrivono contemporaneamente
2. **Crash durante scrittura** - Server terminato mentre il DB era in scrittura
3. **File system issues** - Problemi con il disco
4. **WAL mode issues** - Write-Ahead Log non gestito correttamente

**Prevenzione futura:**
1. ✅ Usa WAL mode (già configurato)
2. ✅ Un solo processo scrive al DB alla volta
3. ✅ Backup automatici regolari
4. ❌ NON killare PM2 con -9 (usa `pm2 stop` o `pm2 restart`)

---

## 📋 Backup Strategy

### Backup Automatico (Raccomandato)

Crea uno script di backup giornaliero:

```bash
#!/bin/bash
# ~/backup-contact-db.sh

DB_PATH=~/danielecamiz-site/cms/db/main.sqlite
BACKUP_DIR=~/db-backups
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup del database
cp $DB_PATH $BACKUP_DIR/main.sqlite.backup-$TIMESTAMP

# Mantieni solo gli ultimi 7 backup
cd $BACKUP_DIR
ls -t main.sqlite.backup-* | tail -n +8 | xargs rm -f

echo "✅ Backup completato: main.sqlite.backup-$TIMESTAMP"
```

Aggiungi al crontab:
```bash
crontab -e
# Aggiungi questa riga (backup ogni giorno alle 3 AM):
0 3 * * * ~/backup-contact-db.sh >> ~/db-backup.log 2>&1
```

### Backup Manuale

```bash
cd ~/danielecamiz-site/cms/db
cp main.sqlite main.sqlite.backup-$(date +%Y%m%d-%H%M%S)
```

---

## 🚦 Quando Usare Questo Script

**Usa questo script SE:**
- ✅ Vedi errori tipo "SQLITE_CORRUPT" o "malformed database"
- ✅ I toggle non funzionano correttamente
- ✅ I dati sembrano corrotti o mancanti
- ✅ L'applicazione si comporta in modo strano

**NON usare questo script SE:**
- ❌ Tutto funziona normalmente
- ❌ Vuoi solo aggiungere/modificare dati (usa l'editor!)
- ❌ Vuoi fare "solo un reset" (usa `migrate-safe.js` invece)

---

## 📞 Supporto

Se lo script fallisce o hai problemi:

1. **Controlla i log:**
```bash
pm2 logs contact-admin --lines 50
pm2 logs contact-site --lines 50
```

2. **Verifica che il commit sia presente:**
```bash
cd ~/danielecamiz-site
git log --oneline -5
# Cerca: "fix: add emergency database recovery script"
```

3. **Controlla integrità filesystem:**
```bash
df -h  # Verifica spazio disco
```

---

## ✅ Checklist Post-Recovery

Dopo aver eseguito il recovery:

- [ ] Script completato senza errori
- [ ] PM2 riavviato (`pm2 restart contact-admin contact-site`)
- [ ] Editor si apre senza errori (vai su `/editor/visual`)
- [ ] Settings (nome, bio) sono corretti
- [ ] Link sono presenti e corretti
- [ ] Toggle visibilità funzionano (ON/OFF riflettono stato reale)
- [ ] Salvare e ricaricare preserva i dati
- [ ] Sito pubblico mostra i dati corretti
- [ ] Thumbnail YouTube appaiono per link YouTube

Se tutti questi check passano ✅ - il database è stato ricostruito con successo!

---

## 🎉 Prossimi Passi

Dopo il recovery:

1. **Annota i tuoi dati importanti** in un file di backup (nome, bio, link principali)
2. **Configura backup automatici** (vedi sezione sopra)
3. **Monitora il DB** per alcuni giorni
4. **Non usare mai `rebuild-simple.js`** (usa solo `migrate-safe.js`)

---

## 🔗 File Correlati

- `contact-admin/emergency-rebuild-db.js` - Script di recovery
- `contact-admin/migrate-safe.js` - Migrazione sicura (per aggiornamenti futuri)
- `cms/db/migrations/033_create_contact_tables.sql` - Schema tabelle
- `cms/db/migrations/034_seed_contact_data.sql` - Dati di default

---

**Buona fortuna! 🍀**
