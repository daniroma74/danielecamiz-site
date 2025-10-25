# Contact Site - Linktree Style

Minisito indipendente stile Linktree per Daniele Camiz, accessibile su `contact.danielecamiz.com`.

## Struttura

```
contact-site/
├── server.js           # Server Express principale
├── package.json        # Dipendenze
├── ecosystem.config.js # Configurazione PM2
├── content/           # File JSON con i dati
│   ├── contact-it.json
│   └── contact-en.json
├── views/             # Template EJS
│   └── contact.ejs
├── public/            # Asset statici
│   ├── css/
│   │   └── main.css   # Stili dark theme
│   ├── js/
│   │   └── main.js    # Animazioni e interattività
│   └── img/
│       ├── daniele-camiz-foto-profilo.png
│       └── icons/     # Icone social (gold e black)
└── logs/             # Log PM2

```

## Installazione

1. **Clona/copia i file nella directory del progetto**

2. **Installa le dipendenze:**
```bash
npm install
```

3. **Crea la cartella logs:**
```bash
mkdir logs
```

4. **Verifica che le icone siano nella cartella corretta:**
   - Tutte le icone SVG dovrebbero essere in `public/img/icons/`
   - Usa le versioni `-gold.svg` per il tema scuro

## Configurazione

### File di dati (content/)

I file JSON contengono tutti i testi e link del sito:

- `contact-it.json` - Versione italiana
- `contact-en.json` - Versione inglese

Struttura del JSON:
```json
{
  "name": "Nome",
  "role": "Ruolo",
  "bio": "Breve bio",
  "avatar": "/img/avatar.png",
  
  "highlights": [
    {
      "text": "Testo link",
      "url": "https://...",
      "icon": "icon-name.svg"
    }
  ],
  
  "socialLinks": [...],
  "contactLinks": [...],
  "extraLinks": [...]
}
```

### Personalizzazione stile

Il file `public/css/main.css` contiene tutte le variabili CSS per personalizzare:
- Colori tema
- Font
- Spacing
- Border radius
- Transizioni

## Avvio

### Sviluppo locale:
```bash
npm run dev
# oppure
node server.js
```
Il sito sarà disponibile su `http://localhost:4003`

### Produzione con PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Controllo stato:
```bash
pm2 status contact-site
pm2 logs contact-site
```

## Funzionalità

### ✅ Implementate
- **Bilingue IT/EN** con switch lingua e cookie memoria
- **Dark theme** professionale con accenti gold
- **Mobile first** responsive design
- **Animazioni** smooth al caricamento e hover
- **Effetto ripple** sui bottoni
- **Copy to clipboard** per email/telefono
- **SEO friendly** con meta tags appropriati
- **Performance** ottimizzata con compression e cache

### 📝 Future (opzionali)
- Integrazione con modulo news per highlights dinamici
- Analytics tracking avanzato
- A/B testing per ottimizzazione conversioni
- QR code dinamico
- Tema light/dark switch

## Integrazione con altri moduli

### Per popolare gli highlights dal modulo news:

Nel `server.js`, aggiungi una funzione per recuperare le news:
```javascript
async function fetchLatestNews(lang) {
  try {
    const response = await fetch(`https://newsletter.danielecamiz.com/api/news/latest?lang=${lang}&limit=3`);
    return await response.json();
  } catch {
    return [];
  }
}
```

E integra nel `prepareContactData()`:
```javascript
const newsItems = await fetchLatestNews(lang);
if (newsItems.length > 0) {
  data.highlights = newsItems.map(item => ({
    text: item.title,
    url: item.url,
    icon: 'news-icon.svg'
  }));
}
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name contact.danielecamiz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name contact.danielecamiz.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Cache statico
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://localhost:4003;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## Troubleshooting

### Stili non caricati
- Verifica che il file `main.css` sia in `public/css/`
- Controlla i permessi della cartella public

### Icone non visibili
- Assicurati che tutte le icone SVG siano in `public/img/icons/`
- Usa i nomi corretti nei JSON (es: `instagram-gold.svg`)

### Lingua non salvata
- Verifica che i cookie siano abilitati nel browser
- Controlla che il dominio sia configurato correttamente

## Supporto

Per problemi o domande, controlla i log:
```bash
pm2 logs contact-site --lines 100
```

---

**Versione:** 2.0.0  
**Autore:** Daniele Camiz  
**Licenza:** MIT