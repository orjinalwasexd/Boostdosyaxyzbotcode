# Boostdosyaxyzbotcode

Discord boost ve üye paketleri satış sitesi. Node.js 20.19.6 ile çalışır, bot-hosting.net gibi Node destekli hostinglerde doğrudan çalıştırılabilir.

## Özellikler

- Modern, mobil uyumlu, tamamen Türkçe arayüz
- Kategorili paket listesi (Sunucu Boost, Üye Paketleri)
- Satın Al butonu mevcut, ödemeler şu an **kapalı** (tıklanınca bilgilendirme gösterir)
- Ödeme yöntemi: IBAN, komisyonsuz, fiyatlara her şey dahil
- `/wasexd` adresinde yönetim paneli
  - Giriş yalnızca **Discord** ile yapılır, kullanıcı adı/şifre yoktur
  - Yalnızca kurucu (`545574728186855424`) girebilir, diğer hesaplar reddedilir
  - Kategori ekleme / düzenleme / silme
  - Ürün ekleme / düzenleme / silme / gizleme

### Hazır gelen paketler

| Paket | Süre | Fiyat |
|---|---|---|
| 14x Boost | 1 Ay | 130 ₺ |
| 14x Boost | 3 Ay | 350 ₺ |
| 625 Üye | — | 100 ₺ |

Bunlar ilk çalıştırmada otomatik oluşturulur; panelden düzenleyebilirsin.

## Kurulum

### 1. Discord uygulaması

1. https://discord.com/developers/applications adresinde botunun uygulamasını aç.
2. **OAuth2** sekmesinden **Client ID** ve **Client Secret** değerlerini al.
3. **Redirects** kısmına şunu ekle: `https://alanadin.com/wasexd/callback`
   (`BASE_URL` ile birebir aynı olmalı.)

### 2. Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyala ve doldur:

| Değişken | Açıklama |
|---|---|
| `PORT` | Sunucu portu. bot-hosting.net `SERVER_PORT` verirse o otomatik kullanılır. |
| `BASE_URL` | Sitenin tam adresi, sonunda `/` olmadan. Örn. `https://alanadin.com` veya `http://ip:port` |
| `DISCORD_CLIENT_ID` | Discord uygulamasının Client ID değeri |
| `DISCORD_CLIENT_SECRET` | Discord uygulamasının Client Secret değeri |
| `OWNER_DISCORD_ID` | Panele girebilecek tek Discord ID (varsayılan `545574728186855424`) |
| `SESSION_SECRET` | En az 32 karakterlik rastgele bir metin |
| `SITE_NAME` | Sitede görünen ad |
| `DISCORD_INVITE` | (İsteğe bağlı) Alt bilgide gösterilecek Discord davet linki |

Rastgele `SESSION_SECRET` üretmek için:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Çalıştırma

```bash
npm install
npm start
```

bot-hosting.net üzerinde: dosyaları yükle (`node_modules` ve `data` hariç), başlangıç dosyası olarak `src/server.js` seç, `.env` dosyasını oluştur ve sunucuyu başlat.

## Güvenlik

- Admin paneli ve paneli çalıştıran JavaScript, yalnızca giriş yapmış kurucuya sunulur; dışarıdan kaynak kodu görülemez.
- Discord OAuth `state` doğrulaması, oturum yenileme ve giriş sonrası token iptali yapılır.
- Yönetim işlemleri CSRF token + Origin kontrolü ile korunur.
- Helmet ile sıkı Content-Security-Policy, HSTS (HTTPS'te), clickjacking koruması.
- Genel, giriş ve panel API'leri için istek sınırlama (rate limit).
- Tüm girişler sunucuda doğrulanır ve kısaltılır; sayfada yalnızca `textContent` ile basılır (XSS yok).
- Oturum çerezi `HttpOnly`, `SameSite=Lax`, HTTPS'te `Secure`.
- Veriler `data/store.json` dosyasında tutulur, atomik yazılır ve dışarıya sunulmaz.

> Not: Tarayıcıya giden HTML/CSS/JS'nin `Ctrl+U` ile görüntülenmesi tamamen engellenemez. Bu yüzden istemci dosyalarında yorum ya da gereksiz bilgi yoktur ve tüm gizli işlemler sunucu tarafında yapılır.

## Proje Yapısı

```
├── public/            Herkese açık site (HTML, CSS, JS)
├── views/             Yalnızca sunucunun sunduğu admin sayfaları
├── src/
│   ├── server.js      Giriş noktası
│   ├── config.js      Ortam değişkenleri
│   ├── db.js          JSON veri deposu
│   ├── security.js    Güvenlik başlıkları, rate limit, yetki, CSRF
│   ├── validate.js    Girdi doğrulama
│   ├── sessionStore.js
│   └── routes/
│       ├── public.js  /api
│       └── admin.js   /wasexd
└── data/              Çalışınca oluşur (git'e eklenmez)
```

## Lisans

[MIT](LICENSE)
