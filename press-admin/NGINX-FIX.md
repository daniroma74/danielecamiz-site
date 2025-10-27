# FIX: Attivare press-admin.danielecamiz.com

## Problema
Il dominio `press-admin.danielecamiz.com` mostra errore "500 - Evento non trovato" perché **Nginx non è configurato**.

## Diagnosi
- ✅ Server press-admin funziona su `localhost:3012`
- ✅ PM2 online
- ✅ Database funzionante
- ❌ Nginx non configurato per il dominio

## Soluzione Rapida

### Opzione 1: Script Automatico (Raccomandato)

```bash
cd /home/daniele/danielecamiz-site/press-admin
sudo bash enable-nginx.sh
```

Lo script farà automaticamente:
1. Copia configurazione in `/etc/nginx/sites-available/`
2. Crea link simbolico in `/etc/nginx/sites-enabled/`
3. Testa la configurazione
4. Ricarica Nginx

### Opzione 2: Comandi Manuali

```bash
# 1. Copia configurazione
sudo cp /tmp/press-admin.danielecamiz.com.conf /etc/nginx/sites-available/press-admin.danielecamiz.com

# 2. Crea link simbolico
sudo ln -s /etc/nginx/sites-available/press-admin.danielecamiz.com /etc/nginx/sites-enabled/press-admin.danielecamiz.com

# 3. Testa configurazione
sudo nginx -t

# 4. Ricarica Nginx
sudo systemctl reload nginx
```

## Verifica

Dopo aver eseguito i comandi:

```bash
# Test da terminale
curl -I https://press-admin.danielecamiz.com

# Oppure apri nel browser
https://press-admin.danielecamiz.com
```

Dovresti vedere la pagina di login di PRESS-ADMIN.

## Credenziali

```
Username: admin
Password: DanieleCamiz2025!
```

## Troubleshooting

### Nginx non si ricarica
```bash
# Verifica errori
sudo nginx -t

# Vedi logs
sudo tail -f /var/log/nginx/error.log
```

### 502 Bad Gateway
Il server press-admin non è in esecuzione:
```bash
pm2 status press-admin
pm2 restart press-admin
```

### Certificato SSL non trovato
Verifica che esistano i certificati wildcard:
```bash
ls -la /etc/ssl/cloudflare/wildcard.crt
ls -la /etc/ssl/cloudflare/wildcard.key
```

## Note

- Il dominio usa il certificato wildcard Cloudflare esistente
- Il traffico viene proxato da Nginx alla porta 3012
- PM2 mantiene il processo sempre attivo
