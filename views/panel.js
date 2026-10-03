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

  let csrf = '';
  const data = { categories: [], products: [] };

  let toastTimer;
  const toast = (msg, type) => {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast show ${type || ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
  };

  const api = async (method, url, body) => {
    const res = await fetch(`/wasexd/api${url}`, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      location.href = '/wasexd';
      throw new Error('Oturum sona erdi.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'İşlem başarısız.');
    return json;
  };

  const btn = (text, cls, fn) => {
    const b = el('button', `btn btn-sm ${cls}`, text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  };

  const catForm = $('#cat-form');
  const prodForm = $('#prod-form');

  const resetCat = () => {
    catForm.reset();
    catForm.id.value = '';
    $('#cat-submit').textContent = 'Kategori Ekle';
    $('#cat-cancel').classList.add('hidden');
  };

  const resetProd = () => {
    prodForm.reset();
    prodForm.id.value = '';
    prodForm.active.checked = true;
    $('#prod-submit').textContent = 'Ürün Ekle';
    $('#prod-cancel').classList.add('hidden');
  };

  const editCat = (c) => {
    catForm.id.value = c.id;
    catForm.name.value = c.name;
    catForm.order.value = c.order || 0;
    $('#cat-submit').textContent = 'Kaydet';
    $('#cat-cancel').classList.remove('hidden');
    catForm.name.focus();
  };

  const editProd = (p) => {
    prodForm.id.value = p.id;
    prodForm.name.value = p.name;
    prodForm.categoryId.value = p.categoryId;
    prodForm.price.value = p.price;
    prodForm.duration.value = p.duration || '';
    prodForm.badge.value = p.badge || '';
    prodForm.order.value = p.order || 0;
    prodForm.description.value = p.description || '';
    prodForm.features.value = (p.features || []).join('\n');
    prodForm.active.checked = p.active !== false;
    $('#prod-submit').textContent = 'Kaydet';
    $('#prod-cancel').classList.remove('hidden');
    prodForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    prodForm.name.focus({ preventScroll: true });
  };

  const removeCat = async (c) => {
    const count = data.products.filter((p) => p.categoryId === c.id).length;
    const extra = count ? ` Bu kategorideki ${count} ürün de silinecek.` : '';
    if (!confirm(`"${c.name}" kategorisi silinsin mi?${extra}`)) return;
    try {
      await api('DELETE', `/categories/${encodeURIComponent(c.id)}`);
      toast('Kategori silindi.', 'ok');
      if (catForm.id.value === c.id) resetCat();
      await refresh();
    } catch (e) { toast(e.message, 'err'); }
  };

  const removeProd = async (p) => {
    if (!confirm(`"${p.name}" ürünü silinsin mi?`)) return;
    try {
      await api('DELETE', `/products/${encodeURIComponent(p.id)}`);
      toast('Ürün silindi.', 'ok');
      if (prodForm.id.value === p.id) resetProd();
      await refresh();
    } catch (e) { toast(e.message, 'err'); }
  };

  const render = () => {
    const names = Object.fromEntries(data.categories.map((c) => [c.id, c.name]));

    $('#stat-cat').textContent = data.categories.length;
    $('#stat-prod').textContent = data.products.length;
    $('#stat-active').textContent = data.products.filter((p) => p.active).length;

    const sel = prodForm.categoryId;
    const current = sel.value;
    sel.replaceChildren();
    if (!data.categories.length) {
      const o = el('option', null, 'Önce kategori ekleyin');
      o.value = '';
      sel.append(o);
    }
    data.categories.forEach((c) => {
      const o = el('option', null, c.name);
      o.value = c.id;
      sel.append(o);
    });
    if (current && names[current]) sel.value = current;

    const cl = $('#cat-list');
    cl.replaceChildren();
    if (!data.categories.length) cl.append(el('div', 'empty', 'Henüz kategori yok.'));
    data.categories.forEach((c) => {
      const r = el('div', 'row');
      const info = el('div', 'info');
      info.append(el('div', 'title', c.name));
      const count = data.products.filter((p) => p.categoryId === c.id).length;
      info.append(el('div', 'sub', `${count} ürün · Sıra ${c.order || 0}`));
      const act = el('div', 'actions');
      act.append(btn('Düzenle', 'btn-ghost', () => editCat(c)), btn('Sil', 'btn-danger', () => removeCat(c)));
      r.append(info, act);
      cl.append(r);
    });

    const pl = $('#prod-list');
    pl.replaceChildren();
    if (!data.products.length) pl.append(el('div', 'empty', 'Henüz ürün yok.'));
    data.products.forEach((p) => {
      const r = el('div', 'row');
      const info = el('div', 'info');
      info.append(el('div', 'title', p.name));
      const parts = [names[p.categoryId] || 'Kategorisiz'];
      if (p.duration) parts.push(p.duration);
      if (p.badge) parts.push(p.badge);
      parts.push(`Sıra ${p.order || 0}`);
      info.append(el('div', 'sub', parts.join(' · ')));
      const status = el('span', p.active ? 'pill on' : 'pill off', p.active ? 'Yayında' : 'Gizli');
      const amount = el('span', 'amount', `${tl.format(p.price)} ₺`);
      const act = el('div', 'actions');
      act.append(btn('Düzenle', 'btn-ghost', () => editProd(p)), btn('Sil', 'btn-danger', () => removeProd(p)));
      r.append(info, status, amount, act);
      pl.append(r);
    });
  };

  const refresh = async () => {
    const d = await api('GET', '/data');
    data.categories = d.categories || [];
    data.products = d.products || [];
    render();
  };

  catForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = catForm.id.value;
    const body = { name: catForm.name.value, order: Number(catForm.order.value) || 0 };
    const submit = $('#cat-submit');
    submit.disabled = true;
    try {
      if (id) await api('PUT', `/categories/${encodeURIComponent(id)}`, body);
      else await api('POST', '/categories', body);
      toast(id ? 'Kategori güncellendi.' : 'Kategori eklendi.', 'ok');
      resetCat();
      await refresh();
    } catch (err) { toast(err.message, 'err'); } finally { submit.disabled = false; }
  });

  prodForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = prodForm.id.value;
    const body = {
      name: prodForm.name.value,
      categoryId: prodForm.categoryId.value,
      price: Number(prodForm.price.value),
      duration: prodForm.duration.value,
      badge: prodForm.badge.value,
      order: Number(prodForm.order.value) || 0,
      description: prodForm.description.value,
      features: prodForm.features.value.split('\n').map((s) => s.trim()).filter(Boolean),
      active: prodForm.active.checked,
    };
    const submit = $('#prod-submit');
    submit.disabled = true;
    try {
      if (id) await api('PUT', `/products/${encodeURIComponent(id)}`, body);
      else await api('POST', '/products', body);
      toast(id ? 'Ürün güncellendi.' : 'Ürün eklendi.', 'ok');
      resetProd();
      await refresh();
    } catch (err) { toast(err.message, 'err'); } finally { submit.disabled = false; }
  });

  $('#cat-cancel').addEventListener('click', resetCat);
  $('#prod-cancel').addEventListener('click', resetProd);

  $('#logout').addEventListener('click', async () => {
    try { await api('POST', '/logout'); } catch { }
    location.href = '/wasexd?e=out';
  });

  (async () => {
    try {
      const me = await api('GET', '/me');
      csrf = me.csrf;
      $('#me-name').textContent = me.username || '';
      if (me.avatar) {
        const img = $('#me-avatar');
        img.src = me.avatar;
        img.classList.remove('hidden');
      }
      await refresh();
    } catch (e) { toast(e.message, 'err'); }
  })();
})();
