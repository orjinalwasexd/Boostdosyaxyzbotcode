const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const db = require('../db');
const validate = require('../validate');
const { limiter, requireOwner, requireCsrf, safeEqual } = require('../security');

const router = express.Router();
const views = path.join(__dirname, '..', '..', 'views');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const loginTemplate = fs.readFileSync(path.join(views, 'login.html'), 'utf8');
const panelHtml = fs.readFileSync(path.join(views, 'panel.html'), 'utf8');
const panelJs = fs.readFileSync(path.join(views, 'panel.js'), 'utf8');

const messages = {
  denied: 'Bu panele yalnızca kurucu erişebilir.',
  state: 'Oturum doğrulanamadı, lütfen tekrar deneyin.',
  failed: 'Discord ile giriş başarısız oldu, lütfen tekrar deneyin.',
  cancel: 'Giriş iptal edildi.',
  out: 'Çıkış yapıldı.',
};

const renderLogin = (code) => loginTemplate
  .replaceAll('{{SITE}}', escapeHtml(config.siteName))
  .replace('{{MSG}}', code && messages[code]
    ? `<p class="notice ${code === 'out' ? 'ok' : 'err'}">${escapeHtml(messages[code])}</p>`
    : '');

const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
};

router.use(noStore);

router.get('/', (req, res) => {
  if (req.session.userId === config.ownerId) {
    return res.type('html').send(panelHtml);
  }
  const code = typeof req.query.e === 'string' ? req.query.e : '';
  res.type('html').send(renderLogin(code));
});

router.get('/assets/panel.js', requireOwner, (req, res) => {
  res.type('application/javascript').send(panelJs);
});

const authLimiter = limiter(15 * 60 * 1000, 30);

router.get('/login', authLimiter, (req, res) => {
  if (config.preview) {
    return req.session.regenerate((err) => {
      if (err) return res.redirect('/wasexd?e=failed');
      req.session.userId = config.ownerId;
      req.session.username = 'Önizleme';
      req.session.avatar = null;
      req.session.csrf = crypto.randomBytes(32).toString('hex');
      req.session.save(() => res.redirect('/wasexd'));
    });
  }
  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
  });
  req.session.save(() => res.redirect(`https://discord.com/oauth2/authorize?${params}`));
});

router.get('/callback', authLimiter, async (req, res) => {
  const { code, state, error } = req.query;
  const expected = req.session.oauthState;
  delete req.session.oauthState;

  if (error) return res.redirect('/wasexd?e=cancel');
  if (!expected || !safeEqual(state, expected)) return res.redirect('/wasexd?e=state');
  if (typeof code !== 'string' || code.length > 200) return res.redirect('/wasexd?e=failed');

  try {
    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenRes.ok) return res.redirect('/wasexd?e=failed');
    const token = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!userRes.ok) return res.redirect('/wasexd?e=failed');
    const user = await userRes.json();

    fetch('https://discord.com/api/v10/oauth2/token/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token: token.access_token,
        token_type_hint: 'access_token',
      }),
    }).catch(() => {});

    if (!user || typeof user.id !== 'string' || !safeEqual(user.id, config.ownerId)) {
      console.warn(`Yetkisiz panel giriş denemesi: ${String(user && user.id).slice(0, 25)}`);
      return req.session.destroy(() => res.redirect('/wasexd?e=denied'));
    }

    req.session.regenerate((err) => {
      if (err) return res.redirect('/wasexd?e=failed');
      req.session.userId = user.id;
      req.session.username = String(user.global_name || user.username || '').slice(0, 64);
      req.session.avatar = typeof user.avatar === 'string' && /^(a_)?[0-9a-f]{32}$/.test(user.avatar) ? user.avatar : null;
      req.session.csrf = crypto.randomBytes(32).toString('hex');
      req.session.save(() => res.redirect('/wasexd'));
    });
  } catch (err) {
    console.error('Discord OAuth hatası:', err.message);
    res.redirect('/wasexd?e=failed');
  }
});

const api = express.Router();
api.use(requireOwner, limiter(60 * 1000, 120), express.json({ limit: '32kb' }), requireCsrf);

api.get('/me', (req, res) => {
  const { userId, username, avatar, csrf } = req.session;
  res.json({
    id: userId,
    username,
    avatar: avatar ? `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=64` : null,
    csrf,
  });
});

api.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('bdx.sid', { path: '/' });
    res.json({ ok: true });
  });
});

api.get('/data', (req, res) => {
  res.json({ categories: db.categories(), products: db.products() });
});

api.post('/categories', (req, res) => {
  const r = validate.category(req.body);
  if (r.error) return res.status(400).json({ error: r.error });
  res.status(201).json(db.addCategory(r.value));
});

api.put('/categories/:id', (req, res) => {
  if (!validate.isId(req.params.id)) return res.status(404).json({ error: 'Kategori bulunamadı.' });
  const r = validate.category(req.body);
  if (r.error) return res.status(400).json({ error: r.error });
  const item = db.updateCategory(req.params.id, r.value);
  if (!item) return res.status(404).json({ error: 'Kategori bulunamadı.' });
  res.json(item);
});

api.delete('/categories/:id', (req, res) => {
  if (!validate.isId(req.params.id) || !db.removeCategory(req.params.id)) {
    return res.status(404).json({ error: 'Kategori bulunamadı.' });
  }
  res.json({ ok: true });
});

api.post('/products', (req, res) => {
  const r = validate.product(req.body, (id) => !!db.findCategory(id));
  if (r.error) return res.status(400).json({ error: r.error });
  res.status(201).json(db.addProduct(r.value));
});

api.put('/products/:id', (req, res) => {
  if (!validate.isId(req.params.id)) return res.status(404).json({ error: 'Ürün bulunamadı.' });
  const r = validate.product(req.body, (id) => !!db.findCategory(id));
  if (r.error) return res.status(400).json({ error: r.error });
  const item = db.updateProduct(req.params.id, r.value);
  if (!item) return res.status(404).json({ error: 'Ürün bulunamadı.' });
  res.json(item);
});

api.delete('/products/:id', (req, res) => {
  if (!validate.isId(req.params.id) || !db.removeProduct(req.params.id)) {
    return res.status(404).json({ error: 'Ürün bulunamadı.' });
  }
  res.json({ ok: true });
});

router.use('/api', api);

module.exports = router;
