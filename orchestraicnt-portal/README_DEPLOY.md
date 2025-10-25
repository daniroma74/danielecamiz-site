# ICNT Portal — Backend + Admin (solo tab Risposte, LinkConcerti da Sheet)
- Legge dallo Sheet (Service Account) le **Risposte** e **LinkConcerti**.
- Organici, ruoli e mappa archi in `data/portal-config.json` (modificabile da **/admin.html**).
- PDF organico con logo in `assets/logo.png`.

## Setup rapido
```bash
cd /home/daniele/danielecamiz-site/orchestraicnt-portal
cp .env.example .env   # controlla le variabili (SHEET_ID già impostato)
npm install
node server.js
```

Nginx (reverse proxy) usa root `public/` e proxya `/api` a `127.0.0.1:4012`.

## Endpoint principali
- POST `/api/login` {email, code}
- GET `/api/me/concerts`
- GET `/api/concerts/:short/pdf`
- Admin:
  - GET `/api/admin/config` (header `x-admin-code`)
  - PUT `/api/admin/concerts/:short/organico` (body `{organico: {Sezione: numero}}`)
  - PUT `/api/admin/roles` (body `{roles: ...}`)
