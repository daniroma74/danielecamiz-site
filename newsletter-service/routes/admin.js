// newsletter-service/routes/admin.js
// Registrazione sicura: crea la rotta solo se l'handler ESISTE

import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';

const router = Router();

// helper: bind route se handler esiste, altrimenti log + 501 Not Implemented
function R(method, path, handlerName) {
  const fn = adminController[handlerName];
  if (typeof fn === 'function') {
    router[method](path, fn);
  } else {
    console.error(`[admin-routes] Missing handler "${handlerName}" for ${method.toUpperCase()} ${path}`);
    router[method](path, (_req, res) => {
      // usa la view error se c’è, altrimenti fallback testo
      try {
        return res.status(501).render('error', { status: 501, message: `Funzione ${handlerName} non implementata` });
      } catch {
        return res.status(501).type('text/plain').send(`501 – Funzione ${handlerName} non implementata`);
      }
    });
  }
}

// Dashboard
R('get', '/', 'renderDashboard');
R('get', '/dashboard', 'renderDashboard');

// Campaigns
R('get',  '/campaigns',              'renderCampaigns');
R('get',  '/campaign/new',           'renderCampaignEditor');
R('get',  '/campaign/:id/edit',      'renderCampaignEditor');
R('get',  '/campaign/:id/data',      'getCampaignData');
R('post', '/campaign/save',          'saveCampaign');
R('post', '/campaign/:id/send',      'sendCampaign');
R('get',  '/campaign/:id/stats',     'renderStats');
R('post', '/campaign/:id/delete',    'deleteCampaign');
R('post', '/campaign/:id/duplicate', 'duplicateCampaign');
R('post', '/campaign/:id/resend-unopened', 'resendToUnopened');

// Subscribers
R('get',  '/subscribers',                'renderSubscribers');
R('post', '/subscribers/import',         'importSubscribers');
R('get',  '/subscribers/export',         'exportSubscribers');
R('get',  '/subscriber/:id/data',        'getSubscriberData');
R('post', '/subscriber/add',             'addSubscriber');
R('post', '/subscriber/:id/update',      'updateSubscriber');
R('post', '/subscriber/:id/delete',      'deleteSubscriber');
R('post', '/subscriber/:id/toggle',      'toggleSubscriber');
R('post', '/subscriber/:id/status',      'updateSubscriberStatus');

// Bulk operations
R('post', '/subscribers/bulk-status', 'bulkUpdateStatus');
R('post', '/subscribers/bulk-tag',    'bulkAddTag');
R('post', '/subscribers/bulk-delete', 'bulkDelete');

// Templates
R('get',  '/templates',            'renderTemplates');
R('get',  '/template/new',         'renderTemplateEditor');
R('get',  '/template/:id/edit',    'renderTemplateEditor');
R('get',  '/template/:id/data',    'getTemplateData');
R('post', '/template/save',        'saveTemplate');
R('post', '/template/:id/delete',  'deleteTemplate');
R('post', '/template/:id/duplicate','duplicateTemplate');

// Statistics & Automations
R('get', '/statistics', 'renderStatistics');
R('get', '/automation', 'renderAutomation');

// Utilities
R('post', '/cleanup',     'cleanupList');
R('get',  '/test-email',  'renderTestEmail');
R('post', '/test-email',  'sendTestEmail');
R('get',  '/settings',    'renderSettings');

// Digest Newsletter
R('get',  '/digest/preview',     'previewDigest');
R('post', '/digest/test',        'sendTestDigest');
R('post', '/digest/send',        'sendDigest');

export default router;