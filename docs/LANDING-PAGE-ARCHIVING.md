# Landing Page Archiving System

**Created:** 2025-12-03
**Status:** Production Ready ✅

## Overview

Sistema automatico per creare e conservare snapshot HTML completi delle landing pages degli eventi passati.

## Funzionamento

### 1. Creazione Automatica Snapshot

**Quando**: Ogni giorno alle 03:05 AM (cron job)

**Come**:
- Script `/scripts/create-event-snapshots.js` cerca eventi con:
  - `date < oggi`
  - `is_future = 1` (non ancora archiviati)
  - `slug IS NOT NULL` (hanno landing page)
  - Nessuno snapshot esistente
- Per ogni evento trovato:
  1. Fetch dell'HTML completo della LP (`http://localhost:3121?event={slug}`)
  2. Estrazione del custom CSS da `landing_settings`
  3. Salvataggio in tabella `landing_snapshots`
  4. Impostazione `is_future = 0`

**Risultato**: LP "congelata" nel tempo, accessibile anche dopo l'evento

### 2. Visualizzazione Snapshot

**URL**: `/archive/snapshot/{slug}` (solo per admin autenticati)

**Accesso**:
1. Admin va su `events-admin.danielecamiz.com/archive`
2. Vede lista eventi archiviati
3. Se evento ha snapshot: bottone "📷 Vedi Snapshot"
4. Click → apre HTML salvato in nuova tab

**Cosa mostra**:
- HTML completo della LP al momento dell'evento
- CSS custom (se presente)
- Immagini, programma, performers esattamente come erano

### 3. Stati Possibili nell'Archivio

#### ✅ Con Snapshot
```
[📷 Vedi Snapshot]  [📋 Prenotazioni]
✓ Archiviato 28 set
```
Landing page congelata disponibile

#### ⏳ Snapshot in Creazione
```
[🕐 Snapshot in Creazione...]  [📋 Prenotazioni]
```
Evento passato ma snapshot non ancora creato (verrà fatto alle 03:05 AM)

#### ❌ LP Non Disponibile
```
[🚫 LP Non Disponibile]
```
Evento troppo vecchio, mai aveva slug

## Database

### Tabella: `landing_snapshots`

```sql
CREATE TABLE landing_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concert_id INTEGER NOT NULL UNIQUE,
  snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  html_content TEXT NOT NULL,           -- HTML completo renderizzato
  custom_css TEXT,                       -- CSS personalizzato
  meta_data TEXT,                        -- JSON metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);
```

**Indici**:
- `idx_snapshots_concert` su `concert_id`
- `idx_snapshots_date` su `snapshot_date`

## File Coinvolti

### Script Automatico
- `/scripts/create-event-snapshots.js` - Crea snapshot automatici

### Controller
- `/landing/controllers/archiveController.js:4` - `renderArchive()` lista archivio
- `/landing/controllers/archiveController.js:34` - `renderSnapshot()` mostra HTML snapshot

### Route
- `/landing/routes/admin.js:25` - Route `/archive/snapshot/:slug`

### View
- `/landing/views/pages/admin/archive.ejs` - Pagina lista archivio

### Migration
- `/cms/db/migrations/020_landing_snapshots.sql` - Schema tabella

### Cron Job
```cron
# Event Snapshots - Automatic archiving of past events at 3:05 AM daily
5 3 * * * /usr/bin/node /home/daniele/danielecamiz-site/scripts/create-event-snapshots.js >> /home/daniele/danielecamiz-site/logs/snapshots.log 2>&1
```

## Gestione Manuale

### Creare Snapshot Manualmente

```bash
cd /home/daniele/danielecamiz-site
node scripts/create-event-snapshots.js
```

### Verificare Snapshot Esistenti

```sql
SELECT c.title, c.slug, ls.snapshot_date, LENGTH(ls.html_content) as size
FROM concerts c
JOIN landing_snapshots ls ON ls.concert_id = c.id
ORDER BY ls.snapshot_date DESC;
```

### Eliminare Snapshot Specifico

```sql
DELETE FROM landing_snapshots WHERE concert_id = {id};
-- Poi ri-esegui lo script per ricrearlo
```

## Log

**File**: `/home/daniele/danielecamiz-site/logs/snapshots.log`

**Formato**:
```
🚀 Event Snapshot Creator
==================================================
📅 Today: 2025-12-03

📋 Found 2 event(s) to archive:

📸 Creating snapshot for: Concerto d'Autunno 2025
   Date: 2025-09-27
   Slug: concerto-autunno2025
  📥 Fetching http://localhost:3121?event=concerto-autunno2025...
  ✅ Fetched 7192 bytes
   ✅ Snapshot saved to database
   ✅ Event marked as archived (is_future = 0)

==================================================
📊 Summary:
   ✅ Successful: 1
   ❌ Failed: 0
==================================================
```

## Limitazioni & Note

### ❌ Cosa NON viene conservato
- Modifiche post-evento ai dati del concerto
- Commenti o interazioni dinamiche (se presenti)
- Dati esterni (es. mappe Google, embed esterni che cambiano)

### ✅ Cosa VIENE conservato
- HTML completo renderizzato al momento dello snapshot
- CSS custom
- Link a immagini Cloudinary
- Programma musicale
- Performers e ruoli
- Tutte le sezioni della LP (hero, descrizione, programma, gallery, ecc.)

### Subdomain Pubblici

**Comportamento attuale**: I subdomain `{slug}.danielecamiz.com` restano attivi anche per eventi passati, mostrando:
- Banner "Evento Archiviato" in cima
- Dati live dal database
- Form prenotazione disabilitato

**Futuro possibile**: Disabilitare completamente subdomain pubblici per eventi archiviati (redirect a 404 o pagina "Evento Concluso").

## Troubleshooting

### Snapshot non creato

**Sintomo**: Evento passato ma nessun snapshot

**Cause possibili**:
1. Evento senza slug → Verifica `slug IS NOT NULL`
2. Landing server offline durante cron → Controlla PM2 logs
3. Error HTML fetch → Verifica porta 3121 accessibile

**Soluzione**: Ri-esegui manualmente lo script

### HTML Snapshot incompleto

**Sintomo**: Snapshot salvato ma con pochi byte (<1000)

**Causa**: Landing page ha errore di rendering

**Soluzione**:
1. Testa LP manualmente: `curl http://localhost:3121?event={slug}`
2. Correggi errori EJS/database
3. Elimina snapshot: `DELETE FROM landing_snapshots WHERE concert_id = {id}`
4. Ri-esegui script

### Cron job non si avvia

**Verifica**:
```bash
# Controlla crontab
crontab -l | grep snapshots

# Verifica log
tail -f /home/daniele/danielecamiz-site/logs/snapshots.log

# Testa script manualmente
node /home/daniele/danielecamiz-site/scripts/create-event-snapshots.js
```

## Best Practices Seguite (2025)

✅ **Full HTML Snapshot** - Conserva esattamente com'era la pagina
✅ **Automatic Trigger** - Zero gestione manuale
✅ **Database Versioning** - Snapshot separati dai dati live
✅ **Admin-Only Access** - URL privati, no SEO issues
✅ **Cron Job Daily** - Check quotidiano automatico
✅ **Idempotent Script** - Ri-eseguibile senza duplicati (UNIQUE constraint)

## Manutenzione

### Pulizia Snapshot Vecchissimi (opzionale)

Se in futuro gli snapshot occupano troppo spazio:

```sql
-- Elimina snapshot più vecchi di 10 anni
DELETE FROM landing_snapshots
WHERE snapshot_date < date('now', '-10 years');
```

### Backup Consigliato

Gli snapshot sono nel database principale `cms/db/main.sqlite`, quindi:
- ✅ Già inclusi nel backup automatico ogni 6 ore
- ✅ Già protetti dallo script `db-backup.sh`
- ✅ Retention: 7 giorni (ultimi 28 backup)

---

**Versione**: 1.0.0
**Autore**: Claude Code Assistant
**Data Implementazione**: 2025-12-03
