// newsletter-service/controllers/adminController.js

import { queryDB, getOne, runDB } from '../config/database.js';
import { sendNewsletterEmail } from '../services/mailService.js';
import { applyInlineStyles } from '../utils/inlineStyles.js';

const BASE_URL = process.env.BASE_URL || 'https://newsletter-admin.danielecamiz.com';

// ============= UNIFIED DASHBOARD =============
export async function renderDashboard(req, res, next) {
  try {
    const db = req.app.locals.db;

    // Basic stats
    const stats = {
      total_subscribers: (await getOne(db,
        "SELECT COUNT(*) as count FROM newsletter_subscribers"
      ))?.count || 0,

      active_subscribers: (await getOne(db,
        "SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status IN ('active', 'subscribed')"
      ))?.count || 0,

      campaigns_sent: (await getOne(db,
        "SELECT COUNT(*) as count FROM newsletter_campaigns WHERE status = 'sent'"
      ))?.count || 0,

      new_this_week: (await getOne(db,
        "SELECT COUNT(*) as count FROM newsletter_subscribers WHERE created_at >= date('now', '-7 days')"
      ))?.count || 0,

      // Preference stats
      preferences_both: (await getOne(db,
        "SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active' AND preferences = 'both'"
      ))?.count || 0,

      preferences_concerts: (await getOne(db,
        "SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active' AND preferences = 'concerts'"
      ))?.count || 0,

      preferences_news: (await getOne(db,
        "SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active' AND preferences = 'news'"
      ))?.count || 0
    };

    // Get digest data from news-admin API
    let digestData = {
      selectedPosts: [],
      recipientCount: 0
    };

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('http://localhost:3005/news/api/newsletter-posts');
      if (response.ok) {
        const data = await response.json();
        digestData.selectedPosts = data.posts || [];

        // Count recipients who want news
        const newsRecipients = await getOne(db,
          "SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active' AND preferences IN ('news', 'both')"
        );
        digestData.recipientCount = newsRecipients?.count || 0;
      }
    } catch (error) {
      console.error('Error fetching digest data from news-admin:', error);
    }

    res.render('pages/unified-dashboard', { stats, digestData });
  } catch (error) {
    console.error('Dashboard error:', error);
    next(error);
  }
}

// ============= CAMPAIGNS =============
export async function renderCampaigns(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    const campaigns = await queryDB(db, `
      SELECT 
        c.*,
        COUNT(DISTINCT l.subscriber_id) as unique_opens
      FROM newsletter_campaigns c
      LEFT JOIN newsletter_logs l ON c.id = l.campaign_id AND l.event_type = 'open'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `) || [];
    
    campaigns.forEach(c => {
      c.open_count = c.unique_opens || 0;
    });
    
    res.render('pages/campaigns', { campaigns });
  } catch (error) {
    next(error);
  }
}

export async function renderCampaignEditor(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    let campaign = null;
    if (id) {
      campaign = await getOne(db, 
        'SELECT * FROM newsletter_campaigns WHERE id = ?', [id]
      );
      
      if (campaign && campaign.content_json) {
        campaign.content = campaign.content_json;
      }
    }
    
    res.render('pages/campaign-editor', { campaign });
  } catch (error) {
    next(error);
  }
}

export async function saveCampaign(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { id, name, subject, preheader, content } = req.body;
    
    console.log('💾 Salvataggio campagna:', { id, name, subject, preheader, contentLength: content?.length });
    
    if (!name || !subject) {
      return res.json({ 
        success: false, 
        error: 'Nome e oggetto sono obbligatori' 
      });
    }
    
    if (id) {
      await runDB(db, `
        UPDATE newsletter_campaigns 
        SET name = ?, subject = ?, preheader = ?, content_json = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [name, subject, preheader || null, content || '', id]);
      
      console.log('✅ Campagna aggiornata:', id);
      res.json({ success: true, id });
    } else {
      const result = await runDB(db, `
        INSERT INTO newsletter_campaigns 
        (name, subject, preheader, content_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'draft', datetime('now'), datetime('now'))
      `, [name, subject, preheader || null, content || '']);
      
      console.log('✅ Nuova campagna creata:', result.lastID);
      res.json({ success: true, id: result.lastID });
    }
  } catch (error) {
    console.error('❌ Errore salvataggio:', error);
    res.json({ success: false, error: error.message });
  }
}

export async function sendCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const { test_email } = req.body;
    const db = req.app.locals.db;
    
    const campaign = await getOne(db, 
      'SELECT * FROM newsletter_campaigns WHERE id = ?', [id]
    );
    
    if (!campaign) {
      return res.json({ success: false, error: 'Campagna non trovata' });
    }
    
    // Leggi template HTML
    const fs = await import('fs/promises');
    const path = await import('path');
    const templatePath = path.join(process.cwd(), 'templates', 'email-v2.html');
    let htmlTemplate = await fs.readFile(templatePath, 'utf8');
    
    // Test email
    if (test_email) {
      const testToken = Buffer.from(test_email).toString('base64');
      
      const preheader = campaign.preheader ? 
        `<div style="display:none;font-size:1px;color:#0b0b0b;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${campaign.preheader}</div>` : '';
      
      const styledContent = applyInlineStyles(campaign.content_json || '');
      
      const testHtml = htmlTemplate
        .replace('{{SUBJECT}}', campaign.subject)
        .replace('{{PREHEADER}}', preheader)
        .replace('{{CONTENT}}', styledContent)
        .replace('{{MANAGE_LINK}}', `${BASE_URL}/newsletter/manage?email=${encodeURIComponent(test_email)}`)
        .replace('{{UNSUBSCRIBE_LINK}}', `${BASE_URL}/api/unsubscribe/${testToken}`)
        .replace('{{YEAR}}', new Date().getFullYear())
        .replace('{{EMAIL}}', test_email)
        .replace('{{TRACKING_PIXEL}}', '');
      
      await sendNewsletterEmail(test_email, `[TEST] ${campaign.subject}`, testHtml);
      return res.json({ success: true, message: 'Test inviato' });
    }
    
    // Invio a tutti
    const subscribers = await queryDB(db, `
      SELECT * FROM newsletter_subscribers 
      WHERE status IN ('active', 'subscribed')
    `) || [];
    
    if (subscribers.length === 0) {
      return res.json({ success: false, error: 'Nessun iscritto attivo' });
    }
    
    let sent = 0;
    let failed = 0;
    
    const preheader = campaign.preheader ? 
      `<div style="display:none;font-size:1px;color:#0b0b0b;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${campaign.preheader}</div>` : '';
    
    const styledContent = applyInlineStyles(campaign.content_json || '');
    
    for (const subscriber of subscribers) {
      try {
        const unsubToken = Buffer.from(subscriber.email).toString('base64');
        
        const personalizedHtml = htmlTemplate
          .replace('{{SUBJECT}}', campaign.subject)
          .replace('{{PREHEADER}}', preheader)
          .replace('{{CONTENT}}', styledContent)
          .replace('{{MANAGE_LINK}}', `${BASE_URL}/newsletter/manage?email=${encodeURIComponent(subscriber.email)}`)
          .replace('{{UNSUBSCRIBE_LINK}}', `${BASE_URL}/api/unsubscribe/${unsubToken}`)
          .replace('{{YEAR}}', new Date().getFullYear())
          .replace('{{EMAIL}}', subscriber.email)
          .replace('{{TRACKING_PIXEL}}', `<img src="${BASE_URL}/api/track/${id}/${subscriber.id}/open.gif" width="1" height="1" style="display:none;" alt="">`);
        
        await sendNewsletterEmail(subscriber.email, campaign.subject, personalizedHtml);
        sent++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Errore invio a ${subscriber.email}:`, error);
        failed++;
      }
    }
    
    await runDB(db, `
      UPDATE newsletter_campaigns 
      SET status = 'sent', sent_at = datetime('now'), sent_count = ?
      WHERE id = ?
    `, [sent, id]);
    
    res.json({ success: true, sent, failed });
  } catch (error) {
    console.error('Send error:', error);
    res.json({ success: false, error: error.message });
  }
}

export async function resendToUnopened(req, res) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const campaign = await getOne(db, 
      'SELECT * FROM newsletter_campaigns WHERE id = ?', [id]
    );
    
    if (!campaign || campaign.status !== 'sent') {
      return res.json({ success: false, error: 'Campagna non valida o non ancora inviata' });
    }
    
    const unopenedSubscribers = await queryDB(db, `
      SELECT s.* FROM newsletter_subscribers s
      WHERE s.status IN ('active', 'subscribed')
      AND s.id NOT IN (
        SELECT DISTINCT subscriber_id 
        FROM newsletter_logs 
        WHERE campaign_id = ? AND event_type = 'open'
      )
    `, [id]) || [];
    
    if (unopenedSubscribers.length === 0) {
      return res.json({ success: false, error: 'Tutti hanno già aperto! 🎉' });
    }
    
    // Leggi template
    const fs = await import('fs/promises');
    const path = await import('path');
    const templatePath = path.join(process.cwd(), 'templates', 'email-v2.html');
    let htmlTemplate = await fs.readFile(templatePath, 'utf8');
    
    let sent = 0;
    const reminderSubject = `[PROMEMORIA] ${campaign.subject}`;
    
    const reminderBanner = `
      <div style="background: linear-gradient(135deg, #ffa500, #ff6b35); padding: 20px; margin-bottom: 30px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">
          📌 PROMEMORIA: Non hai ancora letto questa newsletter
        </p>
      </div>
    `;
    
    const reminderContent = reminderBanner + (campaign.content_json || '');
    const styledContent = applyInlineStyles(reminderContent);
    
    const preheader = campaign.preheader ? 
      `<div style="display:none;font-size:1px;color:#0b0b0b;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${campaign.preheader}</div>` : '';
    
    for (const subscriber of unopenedSubscribers) {
      try {
        const unsubToken = Buffer.from(subscriber.email).toString('base64');
        
        const personalizedHtml = htmlTemplate
          .replace('{{SUBJECT}}', reminderSubject)
          .replace('{{PREHEADER}}', preheader)
          .replace('{{CONTENT}}', styledContent)
          .replace('{{MANAGE_LINK}}', `${BASE_URL}/newsletter/manage?email=${encodeURIComponent(subscriber.email)}`)
          .replace('{{UNSUBSCRIBE_LINK}}', `${BASE_URL}/api/unsubscribe/${unsubToken}`)
          .replace('{{YEAR}}', new Date().getFullYear())
          .replace('{{EMAIL}}', subscriber.email)
          .replace('{{TRACKING_PIXEL}}', `<img src="${BASE_URL}/api/track/${id}/${subscriber.id}/open.gif" width="1" height="1" style="display:none;" alt="">`);
        
        await sendNewsletterEmail(subscriber.email, reminderSubject, personalizedHtml);
        sent++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Errore reinvio a ${subscriber.email}:`, error);
      }
    }
    
    res.json({ success: true, sent, message: `Reinviata a ${sent} destinatari` });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function deleteCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    await runDB(db, 'DELETE FROM newsletter_campaigns WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

// ============= TRACKING =============
export async function trackOpen(req, res) {
  try {
    const { campaignId, subscriberId } = req.params;
    const db = req.app.locals.db;
    
    await runDB(db, `
      INSERT OR IGNORE INTO newsletter_logs (campaign_id, subscriber_id, event_type, event_data)
      VALUES (?, ?, 'open', datetime('now'))
    `, [campaignId, subscriberId]);
    
    const existing = await getOne(db, `
      SELECT COUNT(*) as count FROM newsletter_logs 
      WHERE campaign_id = ? AND subscriber_id = ? AND event_type = 'open'
    `, [campaignId, subscriberId]);
    
    if (existing.count === 1) {
      await runDB(db, `
        UPDATE newsletter_campaigns 
        SET open_count = COALESCE(open_count, 0) + 1 
        WHERE id = ?
      `, [campaignId]);
    }
    
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache'
    });
    res.end(pixel);
  } catch (error) {
    console.error('Track error:', error);
    res.status(200).end();
  }
}

// ============= SUBSCRIBERS =============
export async function renderSubscribers(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    const subscribers = await queryDB(db, `
      SELECT * FROM newsletter_subscribers 
      ORDER BY created_at DESC
    `) || [];
    
    res.render('pages/subscribers', { subscribers });
  } catch (error) {
    next(error);
  }
}

export async function addSubscriber(req, res, next) {
  try {
    const { email, name, status } = req.body;
    const db = req.app.locals.db;
    
    if (!email || !email.includes('@')) {
      return res.json({ success: false, error: 'Email non valida' });
    }
    
    await runDB(db, `
      INSERT OR IGNORE INTO newsletter_subscribers 
      (email, name, status, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [email, name || null, status || 'active']);
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function getSubscriberData(req, res, next) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const subscriber = await getOne(db, 
      'SELECT * FROM newsletter_subscribers WHERE id = ?', [id]
    );
    
    if (!subscriber) {
      return res.json({ success: false, error: 'Iscritto non trovato' });
    }
    
    res.json(subscriber);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function updateSubscriber(req, res, next) {
  try {
    const { id } = req.params;
    const { email, name, status, tags } = req.body;
    const db = req.app.locals.db;
    
    if (!email || !email.includes('@')) {
      return res.json({ success: false, error: 'Email non valida' });
    }
    
    await runDB(db, `
      UPDATE newsletter_subscribers 
      SET email = ?, name = ?, status = ?, tags = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [email, name || null, status || 'active', tags || null, id]);
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function toggleSubscriber(req, res, next) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const subscriber = await getOne(db, 
      'SELECT status FROM newsletter_subscribers WHERE id = ?', [id]
    );
    
    if (!subscriber) {
      return res.json({ success: false, error: 'Iscritto non trovato' });
    }
    
    const newStatus = subscriber.status === 'active' ? 'unsubscribed' : 'active';
    
    await runDB(db, `
      UPDATE newsletter_subscribers 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [newStatus, id]);
    
    res.json({ success: true, status: newStatus });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function deleteSubscriber(req, res, next) {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    await runDB(db, 'DELETE FROM newsletter_subscribers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function bulkUpdateStatus(req, res, next) {
  try {
    const { ids, status } = req.body;
    const db = req.app.locals.db;
    
    if (!ids || ids.length === 0) {
      return res.json({ success: false, error: 'Nessun iscritto selezionato' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    
    await runDB(db, `
      UPDATE newsletter_subscribers 
      SET status = ?, updated_at = datetime('now')
      WHERE id IN (${placeholders})
    `, [status, ...ids]);
    
    res.json({ success: true, updated: ids.length });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function bulkAddTag(req, res, next) {
  try {
    const { ids, tag } = req.body;
    const db = req.app.locals.db;
    
    if (!ids || ids.length === 0 || !tag) {
      return res.json({ success: false, error: 'Parametri mancanti' });
    }
    
    let updated = 0;
    
    for (const id of ids) {
      const subscriber = await getOne(db, 
        'SELECT tags FROM newsletter_subscribers WHERE id = ?', [id]
      );
      
      if (subscriber) {
        const currentTags = subscriber.tags ? subscriber.tags.split(',') : [];
        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
          await runDB(db, `
            UPDATE newsletter_subscribers 
            SET tags = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [currentTags.join(','), id]);
          updated++;
        }
      }
    }
    
    res.json({ success: true, updated });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function bulkDelete(req, res, next) {
  try {
    const { ids } = req.body;
    const db = req.app.locals.db;
    
    if (!ids || ids.length === 0) {
      return res.json({ success: false, error: 'Nessun iscritto selezionato' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    
    await runDB(db, `
      DELETE FROM newsletter_subscribers 
      WHERE id IN (${placeholders})
    `, ids);
    
    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function importSubscribers(req, res, next) {
  try {
    const { csvData } = req.body;
    const db = req.app.locals.db;
    
    if (!csvData) {
      return res.json({ success: false, error: 'Nessun dato CSV' });
    }
    
    const lines = csvData.split('\n');
    let imported = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const [email, name] = lines[i].split(',').map(s => s.trim());
      
      if (email && email.includes('@')) {
        try {
          await runDB(db, `
            INSERT OR IGNORE INTO newsletter_subscribers 
            (email, name, status, created_at)
            VALUES (?, ?, 'active', datetime('now'))
          `, [email, name || null]);
          imported++;
        } catch (e) {}
      }
    }
    
    res.json({ success: true, message: `Importati ${imported} iscritti`, imported });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
}

export async function exportSubscribers(req, res, next) {
  try {
    const db = req.app.locals.db;
    
    const subscribers = await queryDB(db, 
      'SELECT email, name, status, created_at FROM newsletter_subscribers ORDER BY email'
    ) || [];
    
    let csv = 'Email,Nome,Stato,Data\n';
    subscribers.forEach(s => {
      csv += `"${s.email}","${s.name || ''}","${s.status}","${s.created_at}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

// ============= STUBS =============
export async function updateSubscriberStatus(req, res) { res.json({ success: false }); }
export async function renderTemplates(req, res) { res.status(404).send('Non implementato'); }
export async function renderTemplateEditor(req, res) { res.status(404).send('Non implementato'); }
export async function getTemplateData(req, res) { res.json({ success: false }); }
export async function saveTemplate(req, res) { res.json({ success: false }); }
export async function deleteTemplate(req, res) { res.json({ success: false }); }
export async function duplicateTemplate(req, res) { res.json({ success: false }); }
export async function renderStatistics(req, res) { res.status(404).send('Non implementato'); }
export async function renderAutomation(req, res) { res.status(404).send('Non implementato'); }
export async function cleanupList(req, res) { res.json({ success: false }); }
export async function renderTestEmail(req, res) { res.status(404).send('Non implementato'); }
export async function sendTestEmail(req, res) { res.json({ success: false }); }
export async function renderSettings(req, res) { res.status(404).send('Non implementato'); }
export async function getCampaignData(req, res) { res.json({ success: false }); }
export async function renderStats(req, res) { res.status(404).send('Non implementato'); }
export async function duplicateCampaign(req, res) { res.json({ success: false }); }

// ============= DIGEST NEWSLETTER =============

/**
 * Generate HTML preview of digest newsletter
 */
export async function previewDigest(req, res, next) {
  try {
    const db = req.app.locals.db;

    // Fetch posts from news-admin API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3005/news/api/newsletter-posts');

    if (!response.ok) {
      return res.status(500).send('Error fetching posts from news-admin');
    }

    const data = await response.json();
    const posts = data.posts || [];

    if (posts.length === 0) {
      return res.send('<h1>No posts selected for newsletter</h1><p>Go to news-admin and mark some articles.</p>');
    }

    // Render email template
    const ejs = await import('ejs');
    const path = await import('path');

    const templatePath = path.join(process.cwd(), 'views', 'email-templates', 'digest.ejs');

    const html = await ejs.renderFile(templatePath, {
      lang: 'it',
      subject: 'Newsletter Daniele Camiz',
      posts: posts,
      unsubscribeUrl: `${BASE_URL}/newsletter/manage?email=example@example.com`
    });

    res.send(html);
  } catch (error) {
    console.error('Preview digest error:', error);
    next(error);
  }
}

/**
 * Send test digest email
 */
export async function sendTestDigest(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, error: 'Email required' });
    }

    const db = req.app.locals.db;

    // Fetch posts from news-admin API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3005/news/api/newsletter-posts');

    if (!response.ok) {
      return res.json({ success: false, error: 'Error fetching posts from news-admin' });
    }

    const data = await response.json();
    const posts = data.posts || [];

    if (posts.length === 0) {
      return res.json({ success: false, error: 'No posts selected for newsletter' });
    }

    // Render email template
    const ejs = await import('ejs');
    const path = await import('path');

    const templatePath = path.join(process.cwd(), 'views', 'email-templates', 'digest.ejs');

    const html = await ejs.renderFile(templatePath, {
      lang: 'it',
      subject: 'Newsletter Daniele Camiz',
      posts: posts,
      unsubscribeUrl: `${BASE_URL}/newsletter/manage?email=${encodeURIComponent(email)}`
    });

    // Send test email
    await sendNewsletterEmail(email, '[TEST] Newsletter Daniele Camiz', html);

    res.json({ success: true, message: `Test email sent to ${email}` });
  } catch (error) {
    console.error('Send test digest error:', error);
    res.json({ success: false, error: error.message });
  }
}

/**
 * Send digest newsletter to all subscribers
 */
export async function sendDigest(req, res) {
  try {
    const db = req.app.locals.db;

    // Fetch posts from news-admin API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3005/news/api/newsletter-posts');

    if (!response.ok) {
      return res.json({ success: false, error: 'Error fetching posts from news-admin' });
    }

    const data = await response.json();
    const posts = data.posts || [];

    if (posts.length === 0) {
      return res.json({ success: false, error: 'No posts selected for newsletter' });
    }

    // Get subscribers who want news (preferences: 'news' or 'both')
    const subscribers = await queryDB(db, `
      SELECT * FROM newsletter_subscribers
      WHERE status = 'active'
      AND preferences IN ('news', 'both')
    `) || [];

    if (subscribers.length === 0) {
      return res.json({ success: false, error: 'No active subscribers for news digest' });
    }

    // Create campaign record
    const campaignSubject = 'Newsletter Daniele Camiz';
    const now = new Date().toISOString();

    const campaignResult = await runDB(db, `
      INSERT INTO newsletter_campaigns
      (name, subject, content_json, type, status, sent_at, sent_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `Digest ${new Date().toLocaleDateString('it-IT')}`,
      campaignSubject,
      JSON.stringify({ posts: posts.map(p => p.id) }),
      'digest',
      'sent',
      now,
      subscribers.length,
      now,
      now
    ]);

    const campaignId = campaignResult.lastID;

    // Render and send emails
    const ejs = await import('ejs');
    const path = await import('path');
    const templatePath = path.join(process.cwd(), 'views', 'email-templates', 'digest.ejs');

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      try {
        const lang = subscriber.lang || 'it';

        const html = await ejs.renderFile(templatePath, {
          lang: lang,
          subject: campaignSubject,
          posts: posts,
          unsubscribeUrl: `${BASE_URL}/newsletter/manage?email=${encodeURIComponent(subscriber.email)}`
        });

        await sendNewsletterEmail(subscriber.email, campaignSubject, html);
        sent++;

        // Log successful send
        await runDB(db, `
          INSERT INTO newsletter_logs
          (campaign_id, subscriber_id, event_type, created_at)
          VALUES (?, ?, ?, ?)
        `, [campaignId, subscriber.id, 'sent', new Date().toISOString()]);

      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark posts as sent in news-admin
    try {
      const postIds = posts.map(p => p.id);
      await fetch('http://localhost:3005/news/api/newsletter-posts/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds })
      });
    } catch (error) {
      console.error('Error marking posts as sent:', error);
    }

    res.json({
      success: true,
      sent,
      failed,
      campaignId,
      message: `Digest sent to ${sent} subscribers`
    });

  } catch (error) {
    console.error('Send digest error:', error);
    res.json({ success: false, error: error.message });
  }
}