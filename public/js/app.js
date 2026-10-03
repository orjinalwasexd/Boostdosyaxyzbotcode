(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };
  const tl = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  let toastTimer;
  const toast = (msg, type) => {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast show ${type || ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3800);
  };

  const state = { categories: [], products: [], active: 'all', payments: { enabled: false } };

  const buy = async (btn) => {
    if (btn.disabled) return;
    if (!state.payments.enabled) {
      toast('Ödemeler şu an kapalı. Lütfen daha sonra tekrar deneyin.', 'err');
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: btn.dataset.id }),
      });
      const data = await res.json().catch(() => ({}));
      toast(data.error || 'Ödemeler şu an kapalı.', res.ok ? 'ok' : 'err');
    } catch {
      toast('Bağlantı hatası, lütfen tekrar deneyin.', 'err');
    } finally {
      setTimeout(() => { btn.disabled = false; }, 1200);
    }
  };

  const card = (p, catName, featured) => {
    const c = el('article', featured ? 'card featured' : 'card');
    if (p.badge) c.append(el('span', 'badge', p.badge));
    c.append(el('span', 'cat', catName || ''));
    c.append(el('h3', null, p.name));
    if (p.description) c.append(el('p', 'desc', p.description));
    const price = el('div', 'price');
    price.append(el('strong', null, `${tl.format(p.price)} ₺`));
    if (p.duration) price.append(el('span', null, `/ ${p.duration}`));
    c.append(price);
    const ul = el('ul', 'features');
    (p.features || []).forEach((f) => ul.append(el('li', null, f)));
    c.append(ul);
    const btn = el('button', 'btn', 'Satın Al');
    btn.type = 'button';
    btn.dataset.id = p.id;
    btn.addEventListener('click', () => buy(btn));
    c.append(btn);
    c.append(el('p', 'pay-meta', 'IBAN ile ödeme · Komisyon yok'));
    return c;
  };

  const render = () => {
    const tabs = $('#tabs');
    tabs.replaceChildren();
    const used = state.categories.filter((c) => state.products.some((p) => p.categoryId === c.id));
    const opts = [{ id: 'all', name: 'Tümü' }, ...used];
    if (used.length > 1) {
      opts.forEach((o) => {
        const b = el('button', 'tab', o.name);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(state.active === o.id));
        b.addEventListener('click', () => { state.active = o.id; render(); });
        tabs.append(b);
      });
    }
    const names = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
    const list = state.products.filter((p) => state.active === 'all' || p.categoryId === state.active);
    const grid = $('#products');
    grid.replaceChildren();
    if (!list.length) {
      grid.append(el('div', 'empty', 'Şu an listelenecek paket bulunmuyor.'));
      return;
    }
    list.forEach((p) => grid.append(card(p, names[p.categoryId], !!p.badge)));
  };

  const load = async () => {
    try {
      const res = await fetch('/api/catalog', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      state.categories = data.categories || [];
      state.products = data.products || [];
      state.payments = data.payments || state.payments;
      if (data.site) {
        if (data.site.name) {
          document.querySelectorAll('[data-site-name]').forEach((n) => { n.textContent = data.site.name; });
        }
        if (data.site.invite && /^https:\/\/(discord\.gg|discord\.com)\//.test(data.site.invite)) {
          const a = $('#invite');
          a.href = data.site.invite;
          a.classList.remove('hidden');
        }
      }
      render();
    } catch {
      const grid = $('#products');
      grid.replaceChildren(el('div', 'empty', 'Paketler yüklenemedi. Sayfayı yenilemeyi deneyin.'));
    }
  };

  $('#year').textContent = new Date().getFullYear();
  load();
})();
