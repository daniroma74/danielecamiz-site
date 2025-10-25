📘 README_dev.md — CMS Daniele Camiz

📁 Struttura delle cartelle principali

root/
│
├── cms/                      # Backend CMS e pannelli admin
│   ├── admin/                # File HTML + JS pannelli admin
│   │   ├── admin-certificati.html
│   │   ├── admin-concerti.html
│   │   ├── ...
│   │   └── js/              # JS separati
│   ├── data/                 # File JSON (contenuti e database)
│   │   ├── bio.json
│   │   ├── concerti.json
│   │   ├── galleria.json
│   │   └── partecipanti.json
│   ├── fonts/                # Font usati nei PDF
│   ├── routes/               # Moduli Express (es. certificatiRoutes.js)
│   ├── uploads/              # Upload temporanei
│   ├── certificati/          # Output PDF salvati
│   └── server.js             # Entry point del server Express
│
├── frontend/                 # Sito pubblico statico
│   ├── css/
│   ├── img/
│   ├── js/
│   └── ...


⸻

🧠 Funzionalità principali del CMS

✅ Bio / Curriculum / Storia
	•	Modifica Markdown ➜ conversione in HTML ➜ salvataggio in bio.json
	•	Modalità split italiano/inglese

✅ Concerti
	•	concerti.json organizzato per anno in ordine anticronologico
	•	Gestione locandina:
	•	Locandine anno corrente: salvate localmente in /frontend/img/locandine
	•	Locandine anni passati: archiviate su Cloudinary (upload e gestione via pannello)
	•	Pannello con anteprima compatta e modale per modifica locandina o dati

✅ Galleria fotografica
	•	Struttura: categorie (concerto, prove, ufficiali…)
	•	Ogni immagine ha: titolo, descrizione, nome SEO-friendly, lingua, categoria
	•	Gestione copertine categoria
	•	Upload in frontend/img/galleria/<categoria>/

✅ Certificati
	•	Due tipi: singolo / cumulativo (PDF)
	•	Generazione via pdf-lib, layout tipografico elegante
	•	Supporto firma grafica, intestazione, intestazione armonica
	•	Salvataggio PDF in cms/certificati/
	•	Invio via email (via Nodemailer)
	•	Ricerca partecipanti con autocompletamento (da partecipanti.json)

⸻

⚙️ Avvio server CMS

node cms/server.js

	•	Server su http://localhost:3000
	•	Tutti i pannelli admin disponibili in cms/admin/*.html

⸻

✍️ Regole e convenzioni

Markdown ➜ HTML
	•	I campi modificabili (bio, curriculum, storia) vengono salvati in Markdown ma convertiti automaticamente in HTML prima del salvataggio nei file JSON.

Nomi SEO immagini
	•	Ogni immagine ha un campo nomeSEO generato a partire dal titolo o descrizione.
	•	È possibile copiarlo e usarlo come nome file.

Upload locandine
	•	Upload locale per concerti futuri (con anteprima e salvataggio immediato)
	•	Upload su Cloudinary per concerti passati (batch disponibile)

⸻

🗂️ File JSON principali
	•	bio.json — contenuti biografici, curriculum, storia (it/en)
	•	concerti.json — lista concerti per anno, con locandina, data, interpreti, titolo, luogo
	•	galleria.json — immagini e categorie per la galleria fotografica
	•	partecipanti.json — elenco studenti/strumentisti con dati persistenti per certificati
	•	comuni.json — mappa codici catastali per codice fiscale

⸻

🚧 Prossimi sviluppi / TODO
	•	Aggiunta pannello per video con categorie (prove, trailer, concerti completi…)
	•	Aggiunta pannello per press-kit (bio stampabile, foto, loghi, ecc.)
	•	Editing CMS da mobile (layout responsive)
	•	Backup automatico giornaliero dei JSON modificati
	•	Esportazione CSV dei partecipanti + ore certificate
	•	Accesso CMS protetto da password (login semplice)

⸻

📌 Ultimo aggiornamento: maggio 2025