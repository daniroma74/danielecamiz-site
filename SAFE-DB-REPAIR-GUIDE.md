# 🛡️ Guida Riparazione Sicura Database

## ⚠️ ATTENZIONE: PRIMA DI PROCEDERE

**Il database `main.sqlite` contiene TUTTI i dati:**
- ✅ Contact site (nome, bio, link)
- ✅ Concerti e stagioni
- ✅ Gallery e media
- ✅ Press e rassegna stampa
- ✅ Video
- ✅ Repertorio
- ✅ Membri orchestra
- ✅ ...e altro

**❌ NON usare `emergency-rebuild-db.js`** - cancella tutto tranne contact!

**✅ Usa `safe-db-repair.js`** - tenta riparazione senza perdere dati

---

## 🚀 Procedura Sicura

### Opzione 1: Script Automatico (Più Sicura)

```bash
cd ~/danielecamiz-site
git pull origin claude/project-review-011CUoMaULBEc6ErgbH4ZpUS

cd contact-admin
node safe-db-repair.js
```

**Lo script:**
1. ✅ Crea backup completo
2. ✅ Tenta riparazione con sqlite3 (se disponibile)
3. ✅ Controlla integrità
4. ✅ Ti dà istruzioni dettagliate

---

### Opzione 2: Riparazione Manuale con SQLite3

**Questo è il metodo PIÙ SICURO** - preserva tutti i dati di tutte le tabelle.

```bash
# 1. Entra nel server
ssh user@server

# 2. Vai alla directory del database
cd ~/danielecamiz-site/cms/db

# 3. Crea backup
cp main.sqlite main.sqlite.backup-$(date +%Y%m%d-%H%M%S)

# 4. Usa SQLite recovery
sqlite3 main.sqlite ".recover" > recovered.sql

# 5. Verifica che recovered.sql non sia vuoto
ls -lh recovered.sql
# Deve essere ~1-2 MB, non 0 bytes

# 6. Rinomina DB corrotto
mv main.sqlite main.sqlite.corrupted

# 7. Ricrea DB da recovery
sqlite3 main.sqlite < recovered.sql

# 8. Verifica integrità
sqlite3 main.sqlite "PRAGMA integrity_check;"
# Output atteso: ok

# 9. Riavvia servizi
pm2 restart contact-admin contact-site
```

---

### Opzione 3: Ripristino da Backup

Se hai backup recenti:

```bash
cd ~/danielecamiz-site/cms/db

# 1. Lista backup disponibili
ls -lht main.sqlite.backup*

# 2. Scegli il backup più recente (es: main.sqlite.backup-20251106)
# Controlla la data!

# 3. Rinomina DB corrotto
mv main.sqlite main.sqlite.corrupted

# 4. Ripristina backup
cp main.sqlite.backup-20251106 main.sqlite

# 5. Riavvia
pm2 restart contact-admin contact-site
```

**⚠️ Perderai le modifiche fatte DOPO il backup!**

---

### Opzione 4: Ricostruzione Solo Contact (ULTIMA RISORSA)

**⚠️ ATTENZIONE: Questa opzione CANCELLA tutto tranne contact!**

**Usa SOLO se:**
- ❌ Le altre opzioni non funzionano
- ❌ Non hai backup
- ❌ Non ti servono i dati di concerti/gallery/press

```bash
# PRIMA: Esporta manualmente i dati importanti!
# - Salva screenshots dell'admin concerti
# - Annota gallery e press importanti
# - Esporta tutto quello che puoi

cd ~/danielecamiz-site/contact-admin
node emergency-rebuild-db.js

# Poi dovrai reinserire manualmente tutti gli altri dati!
```

---

## 🔍 Diagnostica

### Controlla se il DB è Veramente Corrotto

```bash
cd ~/danielecamiz-site/cms/db

# Test 1: Integrity check
sqlite3 main.sqlite "PRAGMA integrity_check;"

# Test 2: Conta tabelle
sqlite3 main.sqlite ".tables"

# Test 3: Query semplice
sqlite3 main.sqlite "SELECT COUNT(*) FROM contact_links;"
```

**Se tutto funziona:**
- Il DB potrebbe non essere corrotto
- Potrebbe essere un problema di lock/concorrenza
- Prova a riavviare PM2: `pm2 restart contact-admin contact-site`

---

## 📋 Checklist Pre-Riparazione

Prima di procedere:

- [ ] Ho fatto screenshot dell'editor contact
- [ ] Ho annotato i link importanti
- [ ] Ho backup recenti (< 1 settimana)
- [ ] Ho controllato la data degli ultimi backup
- [ ] Ho verificato che il DB è davvero corrotto
- [ ] So quale opzione scegliere (1, 2, 3 o 4)
- [ ] Ho tempo per gestire eventuali problemi

---

## 🧪 Verifica Post-Riparazione

Dopo la riparazione:

### 1. Verifica Integrità DB
```bash
sqlite3 main.sqlite "PRAGMA integrity_check;"
# Output: ok
```

### 2. Verifica Tabelle Contact
```bash
sqlite3 main.sqlite "SELECT COUNT(*) FROM contact_links;"
sqlite3 main.sqlite "SELECT name FROM contact_settings WHERE id = 1;"
```

### 3. Verifica Altre Tabelle (se importanti)
```bash
sqlite3 main.sqlite "SELECT COUNT(*) FROM concerts;"
sqlite3 main.sqlite "SELECT COUNT(*) FROM media;"
sqlite3 main.sqlite "SELECT COUNT(*) FROM press_clips;"
```

### 4. Test Applicazioni

```bash
pm2 restart contact-admin contact-site
pm2 logs contact-admin --lines 20
pm2 logs contact-site --lines 20
```

Poi apri:
- `/editor/visual` - deve caricarsi senza errori
- Contact site pubblico - deve mostrare i dati
- Admin altri moduli (concerti, gallery) - verifica che i dati ci siano

---

## 🔄 Backup Automatici (Prevenzione)

Dopo la riparazione, configura backup automatici:

```bash
# Crea script di backup
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_PATH=~/danielecamiz-site/cms/db/main.sqlite
BACKUP_DIR=~/db-backups

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/main.sqlite.backup-$TIMESTAMP

# Mantieni solo ultimi 14 backup (2 settimane)
cd $BACKUP_DIR
ls -t main.sqlite.backup-* | tail -n +15 | xargs rm -f

echo "✅ Backup created: main.sqlite.backup-$TIMESTAMP"
EOF

chmod +x ~/backup-db.sh

# Aggiungi a crontab (backup giornaliero ore 3 AM)
crontab -e
# Aggiungi: 0 3 * * * ~/backup-db.sh >> ~/backup.log 2>&1
```

---

## 🚦 Quale Opzione Scegliere?

### Hai sqlite3 installato sul server?
```bash
which sqlite3
```

**Se SÌ:** ✅ Usa Opzione 2 (Manuale con SQLite3) - PIÙ SICURA

**Se NO:**
- Controlla backup recenti
- **Hai backup < 1 settimana?** → Opzione 3 (Ripristino)
- **No backup?** → Prima tenta Opzione 1 (Script), poi valuta

---

## ❓ FAQ

**Q: Perderò i dati degli altri moduli?**
- Opzione 1: NO (se usa .recover)
- Opzione 2: NO
- Opzione 3: Dipende dal backup
- Opzione 4: SÌ (solo contact rimane)

**Q: Quanto tempo ci vuole?**
- Opzione 1: 2-5 minuti
- Opzione 2: 5-10 minuti
- Opzione 3: 2 minuti
- Opzione 4: 3 minuti

**Q: Posso testare prima?**
- SÌ! Copia il DB in un percorso temporaneo e testa lì

**Q: E se va male?**
- Hai il backup creato all'inizio
- Puoi sempre ripristinarlo

---

## 📞 Supporto

Se hai problemi:

1. **Controlla i log:**
```bash
pm2 logs --lines 50
```

2. **Verifica file DB:**
```bash
ls -lh ~/danielecamiz-site/cms/db/main.sqlite*
```

3. **Test integrità:**
```bash
sqlite3 main.sqlite "PRAGMA integrity_check;"
```

---

## ✅ Raccomandazioni Finali

1. **Scegli Opzione 2** se possibile (più sicura)
2. **Fai backup manuale** prima di procedere
3. **Testa in produzione** negli orari di basso traffico
4. **Monitora i log** dopo il riavvio
5. **Configura backup automatici** dopo il fix

Buona fortuna! 🍀
