# 📸 GUIDA CARICAMENTO FOTO COMPOSITORI

## Compositori da caricare (10):

1. Vasily Kalinnikov
2. Francesco Sartori
3. Stanislao Gastaldon
4. Ernesto De Curtis
5. Dong-jin Kim
6. Marco Enrico Bossi
7. Peter Warlock
8. Salvatore Cardillo
9. Yeon-jun Kim
10. Young-seop Choi

---

## METODO 1: Via Concerts Admin (CONSIGLIATO)

### A. Preparazione
1. Rinomina i file foto con questi nomi esatti:
   ```
   kalinnikov.jpg
   sartori.jpg
   gastaldon.jpg
   decurtis.jpg
   dongjin-kim.jpg
   bossi.jpg
   warlock.jpg
   cardillo.jpg
   yeonjun-kim.jpg
   youngseop-choi.jpg
   ```

### B. Caricamento via Cloudinary Upload Widget

**URL**: http://localhost:4001/concerts (Concerts Admin)

1. Vai su "Repertorio" → "Gestisci Compositori"
2. Cerca ogni compositore
3. Clicca "Carica Ritratto"
4. Seleziona la foto corrispondente
5. Il sistema carica automaticamente su Cloudinary nella cartella `danielecamiz/composers/`

---

## METODO 2: Caricamento Manuale + SQL

### A. Carica su Cloudinary manualmente

1. Vai su: https://console.cloudinary.com/console/c-bc4e1d37ac81f064ca5ffd2e3ded09/media_library/folders/home
2. Crea cartella: `danielecamiz/composers`
3. Carica tutte le 10 foto nella cartella
4. Copia gli URL pubblici generati

### B. Aggiorna database con SQL

Dopo il caricamento, esegui questo SQL sostituendo `YOUR_CLOUDINARY_URL`:

```sql
-- Vasily Kalinnikov
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/kalinnikov.jpg' WHERE full_name = 'Vasily Kalinnikov';

-- Francesco Sartori
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/sartori.jpg' WHERE full_name = 'Francesco Sartori';

-- Stanislao Gastaldon
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/gastaldon.jpg' WHERE full_name = 'Stanislao Gastaldon';

-- Ernesto De Curtis
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/decurtis.jpg' WHERE full_name = 'Ernesto De Curtis';

-- Dong-jin Kim
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/dongjin-kim.jpg' WHERE full_name = 'Dong-jin Kim';

-- Marco Enrico Bossi
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/bossi.jpg' WHERE full_name = 'Marco Enrico Bossi';

-- Peter Warlock
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/warlock.jpg' WHERE full_name = 'Peter Warlock';

-- Salvatore Cardillo
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/cardillo.jpg' WHERE full_name = 'Salvatore Cardillo';

-- Yeon-jun Kim
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/yeonjun-kim.jpg' WHERE full_name = 'Yeon-jun Kim';

-- Young-seop Choi
UPDATE composers SET portrait_url = 'https://res.cloudinary.com/dnwhnz2xy/image/upload/v1234567890/danielecamiz/composers/youngseop-choi.jpg' WHERE full_name = 'Young-seop Choi';
```

Esegui con:
```bash
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite < update-composers.sql
```

---

## DOPO IL CARICAMENTO

Verifica che le foto appaiano:
```bash
sqlite3 /home/daniele/danielecamiz-site/cms/db/main.sqlite "SELECT full_name, portrait_url FROM composers WHERE full_name IN ('Vasily Kalinnikov', 'Francesco Sartori', 'Marco Enrico Bossi');"
```

Ricarica la pagina repertorio:
http://localhost:3001/concerts/repertoire

---

## Per i 3 compositori rimasti senza foto:

- **An-sam Lee**
- **Du-nam Cho**
- **Kyu-hwan Kim**

Uso un placeholder generico (creo un'immagine SVG)
