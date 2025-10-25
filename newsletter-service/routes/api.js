// newsletter-service/routes/api.js
// Routes API pubbliche CORRETTE

import { Router } from 'express';
import { runDB, getOne } from '../config/database.js';

const router = Router();

// ============= SUBSCRIBE =============
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    const db = req.app.locals.db;
    
    if (!email || !email.includes('@')) {
      return res.json({ 
        success: false, 
        error: 'Email non valida' 
      });
    }
    
    const existing = await getOne(db, 
      'SELECT * FROM newsletter_subscribers WHERE email = ?', [email]
    );
    
    if (existing) {
      if (existing.status === 'unsubscribed') {
        await runDB(db, `
          UPDATE newsletter_subscribers 
          SET status = 'active', updated_at = datetime('now')
          WHERE email = ?
        `, [email]);
        return res.json({ success: true, message: 'Iscrizione riattivata!' });
      }
      return res.json({ success: false, error: 'Email già iscritta' });
    }
    
    await runDB(db, `
      INSERT INTO newsletter_subscribers 
      (email, name, status, source, created_at)
      VALUES (?, ?, 'active', 'website', datetime('now'))
    `, [email, name || null]);
    
    res.json({ success: true, message: 'Iscrizione completata!' });
    
  } catch (error) {
    console.error('Subscribe error:', error);
    res.json({ success: false, error: 'Errore iscrizione' });
  }
});

// ============= UNSUBSCRIBE =============
// Per gestire unsubscribe da email (con token)
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Se il token è "test", mostra pagina di test
    if (token === 'test') {
      return res.send(`
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="utf-8">
          <title>Test Unsubscribe</title>
          <style>
            body { 
              font-family: Arial; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              background: linear-gradient(135deg, #667eea, #764ba2);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            h1 { color: #667eea; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🧪 Test Mode</h1>
            <p>Questa è una pagina di test per l'unsubscribe.</p>
            <p>In produzione, questa pagina cancellerebbe l'iscrizione.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    const db = req.app.locals.db;
    
    // Decodifica email dal token
    let email;
    try {
      email = Buffer.from(token, 'base64').toString('utf8');
    } catch (e) {
      throw new Error('Token non valido');
    }
    
    // Aggiorna stato
    await runDB(db, `
      UPDATE newsletter_subscribers 
      SET status = 'unsubscribed', unsubscribed_at = datetime('now')
      WHERE email = ?
    `, [email]);
    
    // Mostra pagina di conferma
    res.send(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Iscrizione Cancellata</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea, #764ba2);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          h1 { color: #52d273; }
          p { color: #666; line-height: 1.6; }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          }
          .btn:hover { background: #764ba2; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Iscrizione Cancellata</h1>
          <p>La tua iscrizione alla newsletter ICNT è stata cancellata.</p>
          <p>Ci dispiace vederti andare!</p>
          <a href="https://danielecamiz.com" class="btn">Torna al sito</a>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Errore</title>
        <style>
          body {
            font-family: Arial;
            text-align: center;
            padding: 50px;
          }
          h1 { color: #ff6b6b; }
        </style>
      </head>
      <body>
        <h1>Errore</h1>
        <p>Si è verificato un errore. Contatta info@danielecamiz.com</p>
      </body>
      </html>
    `);
  }
});

// ============= MANAGE SUBSCRIPTION PAGE =============
// Pagina per gestire la propria iscrizione
router.get('/manage', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gestisci Iscrizione Newsletter</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea, #764ba2);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 10px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
          padding: 40px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          text-align: center;
        }
        p {
          color: #666;
          text-align: center;
          margin-bottom: 30px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          color: #333;
          margin-bottom: 8px;
          font-weight: 500;
        }
        input[type="email"] {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
        }
        input[type="email"]:focus {
          outline: none;
          border-color: #667eea;
        }
        .buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 30px;
        }
        .btn {
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-check {
          background: #667eea;
          color: white;
        }
        .btn-check:hover {
          background: #5569d8;
        }
        .btn-unsubscribe {
          background: #ff6b6b;
          color: white;
        }
        .btn-unsubscribe:hover {
          background: #ff5252;
        }
        #result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 6px;
          display: none;
        }
        .success {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #81c784;
        }
        .error {
          background: #ffebee;
          color: #c62828;
          border: 1px solid #ef5350;
        }
        .info {
          background: #e3f2fd;
          color: #1565c0;
          border: 1px solid #64b5f6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📧 Gestisci Newsletter</h1>
        <p>Controlla o cancella la tua iscrizione</p>
        
        <div class="form-group">
          <label for="email">Il tuo indirizzo email:</label>
          <input type="email" id="email" placeholder="tua@email.com">
        </div>
        
        <div class="buttons">
          <button class="btn btn-check" onclick="checkStatus()">
            🔍 Verifica Stato
          </button>
          <button class="btn btn-unsubscribe" onclick="unsubscribe()">
            ❌ Cancella Iscrizione
          </button>
        </div>
        
        <div id="result"></div>
      </div>
      
      <script>
        function showResult(message, type) {
          const result = document.getElementById('result');
          result.className = type;
          result.innerHTML = message;
          result.style.display = 'block';
        }
        
        async function checkStatus() {
          const email = document.getElementById('email').value;
          if (!email) {
            showResult('Inserisci la tua email', 'error');
            return;
          }
          
          try {
            const response = await fetch('/api/check-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.subscribed) {
              showResult('✅ Sei iscritto alla newsletter ICNT', 'success');
            } else {
              showResult('❌ Non sei iscritto alla newsletter', 'info');
            }
          } catch (error) {
            showResult('Errore durante la verifica', 'error');
          }
        }
        
        async function unsubscribe() {
          const email = document.getElementById('email').value;
          if (!email) {
            showResult('Inserisci la tua email', 'error');
            return;
          }
          
          if (!confirm('Sei sicuro di voler cancellare l\\'iscrizione?')) {
            return;
          }
          
          // Crea token e redirect a unsubscribe
          const token = btoa(email);
          window.location.href = '/api/unsubscribe/' + token;
        }
      </script>
    </body>
    </html>
  `);
});

// ============= CHECK SUBSCRIPTION =============
router.post('/check-subscription', async (req, res) => {
  try {
    const { email } = req.body;
    const db = req.app.locals.db;
    
    const subscriber = await getOne(db,
      'SELECT status FROM newsletter_subscribers WHERE email = ?', [email]
    );
    
    res.json({
      success: true,
      subscribed: subscriber && ['active', 'subscribed'].includes(subscriber.status)
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============= TRACKING PIXEL =============
router.get('/track/:campaignId/:subscriberId/open.gif', async (req, res) => {
  try {
    const { campaignId, subscriberId } = req.params;
    const db = req.app.locals.db;
    
    // Log apertura
    await runDB(db, `
      INSERT OR IGNORE INTO newsletter_logs 
      (campaign_id, subscriber_id, event_type, event_data, created_at)
      VALUES (?, ?, 'open', 'opened', datetime('now'))
    `, [campaignId, subscriberId]);
    
    // Pixel 1x1 trasparente
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(pixel);
  } catch (error) {
    res.status(200).end();
  }
});

export default router;