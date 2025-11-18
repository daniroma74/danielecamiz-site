# Setup Landing Admin - Autenticazione con Nginx

## 🔐 Protezione con Basic Auth

Per risolvere il problema delle sessioni condivise, `landing-admin.cororaro.it` è protetto con **Nginx Basic Authentication** invece di Express sessions.

## 📋 Step da seguire sul SERVER:

### 1. Crea il file password

```bash
sudo htpasswd -c /etc/nginx/.htpasswd-cororaro admin
```

Quando richiesto, inserisci la password: `admin123`

### 2. Aggiorna Nginx configuration

La configurazione è già nel file `nginx.conf.example`.

Copia il blocco per `landing-admin.cororaro.it` nella tua configurazione Nginx attuale:

```bash
sudo nano /etc/nginx/sites-available/cororaro-landing
```

Il blocco importante è:

```nginx
location / {
    # Basic Authentication per proteggere l'admin
    auth_basic "Coro Raro - Landing Admin";
    auth_basic_user_file /etc/nginx/.htpasswd-cororaro;

    proxy_pass http://localhost:3121;
    # ... resto della configurazione proxy
}
```

### 3. Testa e ricarica Nginx

```bash
# Test configurazione
sudo nginx -t

# Se OK, ricarica
sudo systemctl reload nginx
```

### 4. Riavvia PM2

```bash
cd ~/danielecamiz-site
git pull origin claude/cororaro-admin-simplify-01JeFEzUQVAm4aviA68stPeh
pm2 restart cororaro-landing
```

## ✅ Test

Vai su: `https://landing-admin.cororaro.it`

Dovrebbe apparire un popup di login:
- **Username:** `admin`
- **Password:** `admin123`

Dopo il login, vedrai la lista dei concerti per creare landing page!

## 🎯 Flusso completo:

1. Vai su `cororaro.it/admin` → login normale (admin/admin123)
2. Nel dashboard clicca **"Gestisci Landing Page"**
3. Si apre `landing-admin.cororaro.it` → Nginx chiede username/password
4. Inserisci `admin` / `admin123` → Accedi all'editor landing

## 🔄 Cambiare password:

```bash
# Cambia la password per l'utente admin
sudo htpasswd /etc/nginx/.htpasswd-cororaro admin
```

## 📝 Note:

- Le landing **pubbliche** (`slug.cororaro.it`) NON richiedono autenticazione
- Solo `landing-admin.cororaro.it` è protetto da password
- Nessun problema di sessioni condivise perché l'auth è gestita da Nginx
