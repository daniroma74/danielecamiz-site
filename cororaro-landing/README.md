# 🎵 Coro Raro - Sistema Landing Page & Prenotazioni

Sistema completo per creare **landing page bellissime** per i concerti del Coro Raro, con **prenotazione posti** e **newsletter** integrati.

## ✨ Funzionalità

- 📄 **Landing Page Personalizzate** - Una landing dedicata per ogni concerto
- 🎨 **Editor Visuale Semplice** - Modifica tutto dall'interfaccia web
- 📝 **Sistema Prenotazioni** - Form integrato con conferma email
- 💌 **Newsletter** - Raccolta email per aggiornamenti futuri
- 📧 **Email Automatiche** - Conferme e notifiche con template bellissimi
- 📊 **Dashboard Admin** - Gestisci prenotazioni e landing

## 🚀 Setup Rapido

### 1. Installa dipendenze

```bash
cd /home/daniele/danielecamiz-site/cororaro-landing
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env
nano .env
```

Configura almeno questi parametri:
```env
# Email SMTP (per conferme prenotazioni)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@cororaro.it
SMTP_PASS=tua-password-app
EMAIL_FROM=Coro Raro <info@cororaro.it>
```

### 3. Crea le tabelle del database

```bash
node db/apply-migrations.js
```

### 4. Avvia il server

```bash
# Sviluppo
npm run dev

# Produzione
npm start

# Con PM2
npm run pm2:start
```

Il server parte su **http://localhost:3121**

## 📖 Come Usarlo (Per l'Anziano Idiota Tecnofobo 😊)

### 1. Accedi all'Admin

Vai su: `http://staging.cororaro.it:3121/admin/landing`

Vedrai tutti i tuoi concerti. Per ogni concerto puoi:
- ✨ **Creare una landing page** (se non ce l'ha ancora)
- ✏️ **Modificare la landing** esistente
- 👁️ **Vedere l'anteprima** in tempo reale

### 2. Crea/Modifica una Landing

Clicca su "Crea Landing" o "Modifica". Vedrai un editor con:

**Contenuti:**
- Titolo grande (Hero Title)
- Sottotitolo
- Descrizione del concerto
- Immagine di sfondo (opzionale)

**Cosa Mostrare:**
- ☑️ Programma del concerto
- ☑️ Luogo e orario
- ☑️ Form prenotazione
- ☑️ Galleria foto

**Prenotazioni:**
- ☑️ Attiva/Disattiva prenotazioni
- Numero massimo posti per prenotazione (es. 4)
- Scadenza prenotazioni (opzionale)

**Newsletter:**
- ☑️ Raccogli email per newsletter
- Testo invito personalizzato

**Colori:**
- Scegli i colori della landing (con un click!)

### 3. Salva e Pubblica

- Clicca "Salva" → La landing è live!
- Clicca "Salva e Anteprima" → Vedi come appare
- L'editor **salva automaticamente** ogni 30 secondi

### 4. Dove Trovare la Landing

Ogni concerto ha uno "slug" (nome URL):
- Es: concerto "Natale 2024" → slug: `natale-2024`
- La landing sarà su: `http://staging.cororaro.it:3121/natale-2024`

Puoi condividere questo link sui social, via email, ecc.

### 5. Gestire le Prenotazioni

Le prenotazioni arrivano nel database. Per vederle:

```bash
# Lista prenotazioni per un concerto
sqlite3 ../cororaro-site/db/cororaro.db
SELECT * FROM concert_bookings WHERE concert_id = 1;
```

Oppure crea una pagina admin per visualizzarle (TODO).

## 📧 Configurazione Email

### Opzione 1: Gmail (più semplice)

1. Vai su Google Account → Sicurezza
2. Attiva "Verifica in 2 passaggi"
3. Vai su "Password per le app"
4. Genera una password per "Mail"
5. Usa quella password nel file `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tua-email@gmail.com
SMTP_PASS=password-app-generata
```

### Opzione 2: Server Email Personalizzato (info@cororaro.it)

Se hai già un server email (tipo quello che usi per i tuoi siti):

```env
SMTP_HOST=mail.cororaro.it
SMTP_PORT=587
SMTP_USER=info@cororaro.it
SMTP_PASS=password-email
EMAIL_FROM=Coro Raro <info@cororaro.it>
```

### Opzione 3: Postfix Locale

Se vuoi usare Postfix (come sui tuoi altri siti):

1. Installa Postfix:
```bash
sudo apt install postfix
```

2. Configura nel `.env`:
```env
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=Coro Raro <info@cororaro.it>
```

## 🌐 Deploy in Produzione

### 1. Nginx Configuration

Crea `/etc/nginx/sites-available/landing.cororaro.it`:

```nginx
server {
  listen 80;
  server_name landing.cororaro.it *.cororaro.it;

  location / {
    proxy_pass http://localhost:3121;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Abilita il sito:
```bash
sudo ln -s /etc/nginx/sites-available/landing.cororaro.it /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. PM2 per tenere il server attivo

```bash
npm run pm2:start

# Monitorare
pm2 logs cororaro-landing

# Restart dopo modifiche
npm run pm2:restart
```

### 3. SSL con Let's Encrypt

```bash
sudo certbot --nginx -d landing.cororaro.it -d natale2024.cororaro.it
```

## 📁 Struttura Progetto

```
cororaro-landing/
├── config/           # Configurazione (DB, costanti)
├── controllers/      # Business logic
├── db/
│   └── migrations/   # SQL per creare tabelle
├── middleware/       # Auth middleware
├── models/           # Models (Concert, Booking, etc)
├── public/           # CSS/JS statici
├── routes/           # API routes
│   ├── admin.js      # Routes admin (editor)
│   └── bookings.js   # Routes prenotazioni
├── services/
│   └── email.js      # Servizio email (nodemailer)
├── views/
│   ├── layouts/      # Layout EJS
│   ├── pages/
│   │   ├── admin/    # Pagine admin
│   │   │   ├── landing-list.ejs    # Lista concerti
│   │   │   └── landing-editor.ejs  # Editor landing
│   │   └── landing.ejs  # Landing page pubblica
│   └── partials/     # Componenti riutilizzabili
└── server.js         # Entry point
```

## 🎯 TODO Future (opzionali)

- [ ] Admin dashboard per visualizzare prenotazioni
- [ ] Export prenotazioni in CSV/Excel
- [ ] Invio reminder automatico prima del concerto
- [ ] QR Code per check-in rapido all'ingresso
- [ ] Statistiche e analytics
- [ ] Multi-lingua (EN, IT, ES, etc)
- [ ] Integrazione pagamenti (Stripe/PayPal) per concerti a pagamento

## 🆘 Troubleshooting

### Le email non partono

1. Controlla le credenziali SMTP nel `.env`
2. Verifica che la porta 587 sia aperta
3. Guarda i log: `pm2 logs cororaro-landing`

### La landing non si vede

1. Verifica che il concerto sia "pubblicato" (`is_published = 1`)
2. Controlla lo slug del concerto
3. Verifica che nginx stia proxando correttamente

### L'auth non funziona

Il sistema usa la stessa sessione di `cororaro-site`. Assicurati che:
1. Il sito principale sia in esecuzione
2. Le sessioni siano condivise correttamente
3. Hai fatto login nell'admin principale

## 📞 Supporto

Per problemi o domande:
- Email: daniele@example.com
- Oppure: modifica questo README e aggiorna! 😊

---

**Fatto con ❤️ per il Coro Raro**
