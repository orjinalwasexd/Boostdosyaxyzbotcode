const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

const headers = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
      connectSrc: ["'self'"],
      formAction: ["'self'", 'https://discord.com'],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      objectSrc: ["'none'"],
      ...(config.secure ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: config.secure ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

const permissions = (req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
};

const limiter = (windowMs, limit) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Çok fazla istek gönderdiniz, lütfen biraz bekleyin.' },
});

const requireOwner = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userId === config.ownerId) return next();
  if (req.accepts(['json', 'html']) === 'json' || req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'Yetkisiz erişim.' });
  }
  return res.redirect('/wasexd');
};

const sameOrigin = (req) => {
  const origin = req.get('origin');
  if (origin) return origin === config.baseUrl;
  const referer = req.get('referer');
  if (referer) return referer === config.baseUrl || referer.startsWith(`${config.baseUrl}/`);
  return false;
};

const requireCsrf = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!sameOrigin(req) || !safeEqual(req.get('x-csrf-token'), req.session.csrf)) {
    return res.status(403).json({ error: 'Geçersiz istek.' });
  }
  next();
};

module.exports = { headers, permissions, limiter, requireOwner, requireCsrf, safeEqual };
