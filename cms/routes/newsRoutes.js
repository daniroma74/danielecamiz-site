import express from 'express';
import { listNews, getNewsArticle, feedXml } from '../controllers/newsController.js';

const router = express.Router();

// ===== Feed RSS (dichiarate prima delle parametriche)
router.get('/feed.xml', feedXml);
router.get('/feed',     feedXml);

// ===== Liste (paginazione e categorie)
// Querystring ufficiale: /news?pg=2&cat=video
// Rotte "belle" equivalenti:
//   /news/page/2            -> ?pg=2
//   /news/cat/:cat          -> ?cat=<cat>
//   /news/cat/:cat/page/2   -> ?cat=<cat>&pg=2
router.get('/page/:pg', (req, res, next) => {
  req.query.pg = req.params.pg;
  return listNews(req, res, next);
});
router.get('/cat/:cat', (req, res, next) => {
  req.query.cat = req.params.cat;
  return listNews(req, res, next);
});
router.get('/cat/:cat/page/:pg', (req, res, next) => {
  req.query.cat = req.params.cat;
  req.query.pg  = req.params.pg;
  return listNews(req, res, next);
});

// Lista news (default)
router.get('/', listNews);

// ===== Alias legacy (se esistono vecchi link)
router.get('/post/:id/:slug', getNewsArticle);
router.get('/post/:id',       getNewsArticle);

// ===== Dettaglio articolo
router.get('/:id/:slug', getNewsArticle);
router.get('/:id',       getNewsArticle);

export default router;