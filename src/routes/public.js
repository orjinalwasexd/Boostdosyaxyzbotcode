const express = require('express');
const db = require('../db');
const config = require('../config');

const router = express.Router();

router.get('/catalog', (req, res) => {
  const categories = db.categories().map(({ id, name }) => ({ id, name }));
  const products = db.products()
    .filter((p) => p.active)
    .map(({ id, categoryId, name, description, price, duration, badge, features }) => ({
      id, categoryId, name, description, price, duration, badge, features,
    }));
  res.set('Cache-Control', 'no-store');
  res.json({
    site: { name: config.siteName, invite: config.discordInvite },
    payments: { enabled: false, method: 'IBAN', commission: false },
    categories,
    products,
  });
});

router.post('/order', (req, res) => {
  res.status(503).json({ error: 'Ödemeler şu an kapalı. Lütfen daha sonra tekrar deneyin.' });
});

module.exports = router;
