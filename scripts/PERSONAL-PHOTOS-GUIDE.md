# 📸 GUIDA CARICAMENTO FOTO PERSONALI COMPOSITORI

## Le tue 10 foto da rinominare:

1. **Vasily Kalinnikov** → `kalinnikov.jpg`
2. **Francesco Sartori** → `sartori.jpg`
3. **Stanislao Gastaldon** → `gastaldon.jpg`
4. **Ernesto De Curtis** → `decurtis.jpg`
5. **Dong-jin Kim** → `dongjin-kim.jpg`
6. **Marco Enrico Bossi** → `bossi.jpg`
7. **Peter Warlock** → `warlock.jpg`
8. **Salvatore Cardillo** → `cardillo.jpg`
9. **Yeon-jun Kim** → `yeonjun-kim.jpg`
10. **Young-seop Choi** → `youngseop-choi.jpg`

---

## PROCEDURA COMPLETA:

### STEP 1: Esegui lo script di migrazione automatica

Questo script scaricherà automaticamente le foto dei compositori famosi da Wikipedia e le caricherà su Cloudinary:

```bash
cd /home/daniele/danielecamiz-site

# Imposta le credenziali Cloudinary (solo la prima volta)
export CLOUDINARY_API_KEY="your_api_key"
export CLOUDINARY_API_SECRET="your_api_secret"

# Esegui lo script
node scripts/migrate-composers-to-cloudinary.js
```

Lo script:
- ✅ Scarica automaticamente ~42 foto di compositori famosi da Wikipedia
- ✅ Le carica su Cloudinary in `danielecamiz/composers/`
- ✅ Aggiorna il database con i nuovi URL
- ⏭️  Salta le tue 10 foto personali (le caricherai manualmente)

---

### STEP 2: Rinomina le tue foto

Rinomina i tuoi 10 file foto con i nomi esatti indicati sopra.

**IMPORTANTE**: Usa esattamente questi nomi (minuscolo, con trattini, .jpg)

---

### STEP 3: Carica le foto su Cloudinary

**Metodo A: Via Web Interface (CONSIGLIATO)**

1. Vai su: https://console.cloudinary.com/console/c-bc4e1d37ac81f064ca5ffd2e3ded09/media_library/folders/home
2. Naviga a: `danielecamiz` → `composers`
3. Trascina tutte le 10 foto rinominate
4. Aspetta che il caricamento completi

**Metodo B: Via Concerts Admin**

1. Vai su: http://localhost:4001/concerts
2. Repertorio → Gestisci Compositori
3. Cerca ogni compositore
4. Clicca "Carica Ritratto"
5. Seleziona la foto corrispondente

---

### STEP 4: Aggiorna il database

Dopo aver caricato le foto su Cloudinary, esegui:

```bash
node scripts/update-personal-composers.js
```

Questo aggiorna il database con gli URL Cloudinary delle tue 10 foto.

---

### STEP 5: Verifica

Apri la pagina repertorio:
```
http://localhost:3001/concerts/repertoire
```

Tutti i 55 compositori dovrebbero ora avere le foto!

---

## TROUBLESHOOTING

### Se mancano le credenziali Cloudinary:

Le trovi su: https://console.cloudinary.com/settings/c-bc4e1d37ac81f064ca5ffd2e3ded09/api-keys

```bash
export CLOUDINARY_API_KEY="123456789012345"
export CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz123456"
```

### Se alcune foto Wikipedia falliscono:

Lo script ti dirà quali compositori non sono stati trovati. Puoi:
1. Cercare manualmente le foto
2. Caricarle su Cloudinary con il nome slug indicato
3. Eseguire di nuovo lo script (salterà quelle già caricate)

### Se vuoi ricaricare tutto:

```bash
# Cancella le foto dalla cartella Cloudinary
# Poi riparti dallo STEP 1
```

---

## RIEPILOGO FILE NECESSARI:

✅ `/scripts/migrate-composers-to-cloudinary.js` - Script migrazione automatica
✅ `/scripts/update-personal-composers.js` - Aggiorna DB con foto personali
✅ `/scripts/PERSONAL-PHOTOS-GUIDE.md` - Questa guida
