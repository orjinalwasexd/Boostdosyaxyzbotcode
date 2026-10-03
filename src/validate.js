const clean = (v, max) => {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
};

const isId = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

const toOrder = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 9999 ? n : 0;
};

const category = (body) => {
  const name = clean(body && body.name, 60);
  if (name.length < 2) return { error: 'Kategori adı en az 2 karakter olmalı.' };
  return { value: { name, order: toOrder(body.order) } };
};

const product = (body, categoryExists) => {
  if (!body || typeof body !== 'object') return { error: 'Geçersiz veri.' };
  const name = clean(body.name, 80);
  if (name.length < 2) return { error: 'Ürün adı en az 2 karakter olmalı.' };
  if (!isId(body.categoryId) || !categoryExists(body.categoryId)) return { error: 'Geçerli bir kategori seçin.' };
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || price > 1000000) return { error: 'Geçerli bir fiyat girin.' };
  const features = Array.isArray(body.features)
    ? body.features.map((f) => clean(f, 80)).filter(Boolean).slice(0, 12)
    : [];
  return {
    value: {
      name,
      categoryId: body.categoryId,
      description: clean(body.description, 400),
      price: Math.round(price * 100) / 100,
      duration: clean(body.duration, 30),
      badge: clean(body.badge, 24),
      features,
      active: body.active !== false,
      order: toOrder(body.order),
    },
  };
};

module.exports = { isId, category, product };
