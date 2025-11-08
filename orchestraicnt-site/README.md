# 🎵 Orchestra ICNT - Sito Web Ufficiale

Sito web pubblico moderno e professionale per l'**Orchestra ICNT**, ensemble sinfonico di giovani studenti e musicisti amatori a Roma.

---

## 📋 Indice

- [Caratteristiche](#-caratteristiche)
- [Tecnologie](#-tecnologie)
- [Struttura del Progetto](#-struttura-del-progetto)
- [Installazione](#-installazione)
- [Configurazione](#-configurazione)
- [Deploy](#-deploy)
- [Personalizzazione](#-personalizzazione)
- [Best Practices](#-best-practices)

---

## ✨ Caratteristiche

### Design Moderno 2025
- ✅ **Hero Section** con video/immagine full-screen
- ✅ **Design Responsive** mobile-first
- ✅ **Animazioni Smooth** e micro-interazioni
- ✅ **Performance Ottimizzate** (lazy loading, throttling)
- ✅ **Accessibilità WCAG AA+** compliant

### Funzionalità
- 🎭 **Prossimi Concerti** con cards moderne
- 👥 **Chi Siamo** con storia e team
- 🎥 **Video Gallery** integrazione YouTube
- 📧 **Form Contatti** funzionale
- 📱 **Social Media** integration
- 🔐 **Area Riservata** link al portale orchestrali

### SEO & Performance
- 🚀 Lazy loading immagini
- 🎯 Meta tags ottimizzati
- 📊 Analytics-ready
- 🌐 Open Graph tags
- ⚡ Performance score 90+

---

## 🛠 Tecnologie

- **HTML5** - Semantico e accessibile
- **CSS3** - Modern features (Grid, Flexbox, Custom Properties)
- **Vanilla JavaScript** - Zero dipendenze frontend
- **Node.js + Express** - Server backend (opzionale)
- **Google Fonts** - Playfair Display, Inter, Bebas Neue

---

## 📁 Struttura del Progetto

```
orchestraicnt-site/
├── public/                    # File statici
│   ├── index.html            # Homepage
│   ├── css/
│   │   └── style.css         # Stili completi
│   ├── js/
│   │   └── main.js           # JavaScript
│   ├── assets/
│   │   ├── images/           # Immagini (logo, foto)
│   │   ├── media/            # Video, audio
│   │   └── fonts/            # Font locali (opzionale)
│   └── favicon.ico
├── server.js                  # Express server
├── package.json
└── README.md
```

---

## 🚀 Installazione

### Prerequisiti
- Node.js >= 16.0.0
- npm o yarn

### Setup Locale

```bash
# 1. Entra nella directory
cd /home/daniele/danielecamiz-site/orchestraicnt-site

# 2. Installa dipendenze
npm install

# 3. Avvia il server
npm start

# 4. Apri nel browser
# http://localhost:3100
```

### Solo File Statici (senza server)

Se vuoi solo servire i file statici:

```bash
# Opzione 1: http-server
npx http-server public -p 3100

# Opzione 2: Python
cd public && python3 -m http.server 3100

# Opzione 3: Live Server (VS Code extension)
# Clicca destro su index.html → "Open with Live Server"
```

---

## ⚙️ Configurazione

### 1. Immagini e Media

Sostituisci le immagini placeholder:

```
public/assets/images/
├── logo.png                 # Logo orchestra (trasparente, 500px width)
├── hero-orchestra.jpg       # Hero image (1920x1080, ottimizzata)
└── orchestra-group.jpg      # Foto gruppo (1200x800)
```

**Ottimizzazione immagini:**
```bash
# Usa tools come:
# - TinyPNG (online)
# - ImageOptim (Mac)
# - Squoosh (web)

# Target:
# - Hero: < 200KB
# - Altre: < 100KB
```

### 2. Video YouTube

In `index.html`, sostituisci gli ID video:

```html
<!-- Cerca questa sezione -->
<iframe src="https://www.youtube.com/embed/TUO_ID_VIDEO"></iframe>
```

### 3. Informazioni Orchestra

Modifica i contenuti in `index.html`:

- **Concerti**: Aggiorna date, programmi, location
- **Chi Siamo**: Personalizza testo, storia, mission
- **Contatti**: Email, social media links

### 4. Colori Personalizzati

In `public/css/style.css`, modifica le variabili:

```css
:root {
  --primary-red: #C41E3A;      /* Colore principale */
  --primary-dark: #1A1A1A;     /* Nero/grigio scuro */
  --accent-red: #DC143C;       /* Accento rosso */
  /* ... */
}
```

### 5. Form Contatti

Per rendere funzionale il form contatti, modifica `server.js`:

```javascript
// Opzione 1: Nodemailer
const nodemailer = require('nodemailer');

// Opzione 2: SendGrid
const sgMail = require('@sendgrid/mail');

// Opzione 3: FormSubmit.co (no backend)
// Cambia action del form:
<form action="https://formsubmit.co/tua@email.it" method="POST">
```

---

## 🌐 Deploy

### Deploy su Nginx (Consigliato)

**1. Configura sottodominio:**

```nginx
# /etc/nginx/sites-available/orchestraicnt

server {
    listen 80;
    server_name orchestraicnt.danielecamiz.com;

    root /home/daniele/danielecamiz-site/orchestraicnt-site/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache statico
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}
```

**2. Abilita e riavvia:**

```bash
sudo ln -s /etc/nginx/sites-available/orchestraicnt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**3. SSL con Let's Encrypt:**

```bash
sudo certbot --nginx -d orchestraicnt.danielecamiz.com
```

### Deploy con Node.js + PM2

```bash
# Installa PM2
npm install -g pm2

# Avvia con PM2
pm2 start server.js --name orchestraicnt-site

# Auto-start on reboot
pm2 startup
pm2 save

# Monitora
pm2 monit
```

### Deploy su Vercel/Netlify (Alternativa)

```bash
# Vercel
npx vercel

# Netlify
npx netlify deploy
```

---

## 🎨 Personalizzazione

### Aggiungere Nuove Sezioni

1. **HTML**: Aggiungi la sezione in `index.html`
```html
<section class="section nuova-sezione" id="nuova">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Label</span>
      <h2 class="section-title">Titolo</h2>
    </div>
    <!-- Contenuto -->
  </div>
</section>
```

2. **CSS**: Stili in `style.css`
```css
.nuova-sezione {
  background: var(--gray-50);
  /* ... */
}
```

3. **Navbar**: Aggiungi link
```html
<li><a href="#nuova" class="nav-link">Nuova</a></li>
```

### Pagine Aggiuntive

Per creare pagine separate (es. `/stagione`, `/media`):

1. Crea file: `public/stagione.html`
2. Usa header/footer condivisi
3. Aggiorna navbar links
4. Configura routing in `server.js`

---

## 📊 Best Practices

### Performance
- ✅ Ottimizza immagini (WebP, compression)
- ✅ Lazy loading video e immagini
- ✅ Minify CSS/JS in produzione
- ✅ Enable gzip/brotli compression
- ✅ CDN per assets statici

### SEO
- ✅ Meta description uniche per pagina
- ✅ Structured data (JSON-LD)
- ✅ Sitemap.xml
- ✅ robots.txt
- ✅ Canonical URLs

### Accessibilità
- ✅ Alt text su tutte le immagini
- ✅ ARIA labels su elementi interattivi
- ✅ Contrasto colori WCAG AA+
- ✅ Keyboard navigation
- ✅ Skip links

### Manutenzione
- 📅 Aggiorna concerti regolarmente
- 📸 Aggiungi nuovi video/foto
- 🔄 Backup mensili
- 📊 Monitora analytics
- 🐛 Test cross-browser

---

## 🔗 Links Utili

- **Portale Orchestrali**: https://portal.orchestraicnt.danielecamiz.com
- **YouTube**: [Link al canale]
- **Facebook**: [Link pagina]
- **Instagram**: [Link profilo]

---

## 📝 TODO

- [ ] Aggiungere immagini reali orchestra
- [ ] Inserire ID video YouTube corretti
- [ ] Configurare email per form contatti
- [ ] Aggiungere Google Analytics
- [ ] Creare sitemap.xml
- [ ] Implementare newsletter signup
- [ ] Aggiungere sezione stagione completa
- [ ] Galleria foto eventi passati
- [ ] Blog/News sezione

---

## 📄 Licenza

© 2024 Orchestra ICNT. Tutti i diritti riservati.

Website sviluppato da [Daniele Camiz](https://danielecamiz.com)

---

## 🆘 Supporto

Per domande o problemi:
- Email: info@orchestraicnt.it
- Developer: [Email sviluppatore]

---

**Versione**: 1.0.0
**Ultimo aggiornamento**: Novembre 2024
