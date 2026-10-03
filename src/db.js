const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dataDir } = require('./config');

const file = path.join(dataDir, 'store.json');

const seed = () => {
  const boost = crypto.randomUUID();
  const member = crypto.randomUUID();
  const now = Date.now();
  return {
    categories: [
      { id: boost, name: 'Sunucu Boost', order: 1, createdAt: now },
      { id: member, name: 'Üye Paketleri', order: 2, createdAt: now },
    ],
    products: [
      {
        id: crypto.randomUUID(), categoryId: boost, name: '14x Boost · 1 Aylık',
        description: 'Sunucunuza 14 adet boost, 1 ay boyunca. Seviye 3 avantajlarının tamamı.',
        price: 130, duration: '1 Ay', badge: '', features: ['14 adet sunucu boostu', 'Seviye 3 avantajları', '1 ay süre'],
        active: true, order: 1, createdAt: now,
      },
      {
        id: crypto.randomUUID(), categoryId: boost, name: '14x Boost · 3 Aylık',
        description: 'Sunucunuza 14 adet boost, 3 ay boyunca. Uzun süreli en avantajlı seçenek.',
        price: 350, duration: '3 Ay', badge: 'Avantajlı', features: ['14 adet sunucu boostu', 'Seviye 3 avantajları', '3 ay süre'],
        active: true, order: 2, createdAt: now,
      },
      {
        id: crypto.randomUUID(), categoryId: member, name: '625 Üye Paketi',
        description: 'Sunucunuza 625 üye eklenir.',
        price: 100, duration: '', badge: '', features: ['625 üye', 'Hızlı teslimat'],
        active: true, order: 3, createdAt: now,
      },
    ],
  };
};

let state;

const load = () => {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) {
    state = seed();
    persist();
    return;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    state = {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
    };
  } catch (err) {
    const backup = `${file}.bozuk-${Date.now()}`;
    fs.copyFileSync(file, backup);
    console.error(`Veri dosyası okunamadı, yedeklendi: ${backup}`);
    state = seed();
    persist();
  }
};

const persist = () => {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
};

const byOrder = (a, b) => (a.order - b.order) || (a.createdAt - b.createdAt);

module.exports = {
  load,
  categories: () => [...state.categories].sort(byOrder),
  products: () => [...state.products].sort(byOrder),
  findCategory: (id) => state.categories.find((c) => c.id === id),
  findProduct: (id) => state.products.find((p) => p.id === id),
  addCategory(data) {
    const item = { id: crypto.randomUUID(), ...data, createdAt: Date.now() };
    state.categories.push(item);
    persist();
    return item;
  },
  updateCategory(id, data) {
    const item = state.categories.find((c) => c.id === id);
    if (!item) return null;
    Object.assign(item, data);
    persist();
    return item;
  },
  removeCategory(id) {
    const before = state.categories.length;
    state.categories = state.categories.filter((c) => c.id !== id);
    if (state.categories.length === before) return false;
    state.products = state.products.filter((p) => p.categoryId !== id);
    persist();
    return true;
  },
  addProduct(data) {
    const item = { id: crypto.randomUUID(), ...data, createdAt: Date.now() };
    state.products.push(item);
    persist();
    return item;
  },
  updateProduct(id, data) {
    const item = state.products.find((p) => p.id === id);
    if (!item) return null;
    Object.assign(item, data);
    persist();
    return item;
  },
  removeProduct(id) {
    const before = state.products.length;
    state.products = state.products.filter((p) => p.id !== id);
    if (state.products.length === before) return false;
    persist();
    return true;
  },
};
