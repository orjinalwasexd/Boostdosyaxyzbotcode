const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const db = require('./db');
const TtlStore = require('./sessionStore');
const { headers, permissions, limiter } = require('./security');

db.load();

const app = express();
app.disable('x-powered-by');
app.set('etag', 'strong');
if (config.secure) app.set('trust proxy', 1);

app.use(headers);
app.use(permissions);
app.use(limiter(15 * 60 * 1000, 600));

const sessionTtl = 12 * 60 * 60 * 1000;
app.use(session({
  name: 'bdx.sid',
  secret: config.sessionSecret,
  store: new TtlStore(sessionTtl),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: config.secure,
  cookie: {
    httpOnly: true,
    secure: config.secure,
    sameSite: 'lax',
    maxAge: sessionTtl,
    path: '/',
  },
}));

app.use('/api', express.json({ limit: '8kb' }), require('./routes/public'));
app.use('/wasexd', require('./routes/admin'));

app.use(express.static(path.join(__dirname, '..', 'public'), {
  dotfiles: 'ignore',
  index: 'index.html',
  maxAge: '1h',
  redirect: false,
}));

app.use((req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/wasexd/api')) {
    return res.status(404).json({ error: 'Bulunamadı.' });
  }
  res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Sunucu hatası.' : 'Geçersiz istek.' });
});

process.on('unhandledRejection', (err) => console.error('Yakalanmamış hata:', err));

app.listen(config.port, config.host, () => {
  console.log(`${config.siteName} ${config.port} portunda çalışıyor → ${config.baseUrl}`);
  if (config.preview) {
    console.log('ÖNİZLEME MODU: Discord girişi atlanır, sadece bu bilgisayardan erişilebilir.');
    console.log(`Admin paneli → ${config.baseUrl}/wasexd`);
  }
});
