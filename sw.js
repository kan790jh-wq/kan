/* KAN V7.0 · Service worker: guarda la "cáscara" de la app para abrirla rápido e instalarla.
   Los datos SIEMPRE se piden al servidor (nunca se guardan inventarios en caché). */
var VERSION = 'kan-v7.1.0';
var CASCARA = ['./', 'index.html', 'ficha.html', 'css/kan.css', 'js/config.js', 'js/api.js', 'js/app.js', 'js/vistas.js', 'manifest.webmanifest',
  'img/logo.png', 'img/logo_dark.png', 'img/mark_dark.png', 'img/icono-192.png', 'img/icono-512.png',
  'img/m_pulgar.webp', 'img/m_tablet.webp', 'img/m_lentes.webp', 'img/m_think.webp', 'img/m_lap.webp', 'img/m_alerta.webp', 'img/m_heart.webp', 'img/m_thumb.webp'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CASCARA); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // API de Apps Script y Google: siempre a la red
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copia); }); return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
