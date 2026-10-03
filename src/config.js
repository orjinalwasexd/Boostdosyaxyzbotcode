const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const crypto = require('crypto');

const preview = process.env.PREVIEW === '1';
if (preview) {
  const port = process.env.SERVER_PORT || process.env.PORT || 3000;
  process.env.BASE_URL = `http://localhost:${port}`;
  process.env.DISCORD_CLIENT_ID = 'onizleme';
  process.env.DISCORD_CLIENT_SECRET = 'onizleme';
  process.env.SESSION_SECRET = crypto.randomBytes(48).toString('hex');
}

const required = ['BASE_URL', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'SESSION_SECRET'];
const missing = required.filter((k) => !process.env[k] || !process.env[k].trim());
if (missing.length) {
  console.error(`Eksik ortam değişkenleri: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET en az 32 karakter olmalı.');
  process.exit(1);
}

const baseUrl = process.env.BASE_URL.trim().replace(/\/+$/, '');

module.exports = {
  preview,
  host: preview ? '127.0.0.1' : '0.0.0.0',
  port: Number(process.env.SERVER_PORT || process.env.PORT || 3000),
  baseUrl,
  secure: baseUrl.startsWith('https://'),
  clientId: process.env.DISCORD_CLIENT_ID.trim(),
  clientSecret: process.env.DISCORD_CLIENT_SECRET.trim(),
  ownerId: (process.env.OWNER_DISCORD_ID || '545574728186855424').trim(),
  sessionSecret: process.env.SESSION_SECRET,
  siteName: (process.env.SITE_NAME || 'Boostdosya').trim(),
  discordInvite: (process.env.DISCORD_INVITE || '').trim(),
  redirectUri: `${baseUrl}/wasexd/callback`,
  dataDir: path.join(__dirname, '..', preview ? 'data-onizleme' : 'data'),
};
