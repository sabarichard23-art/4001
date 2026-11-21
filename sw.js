/* Offline support. The page itself is fetched fresh when online, so updates show up right away. */
var CACHE = 'four-hundred-v11';
var SHELL = ['./', 'index.html', 'mqtt.min.js', 'privacy.html', 'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-500-normal.woff2', 'fonts/barlow-latin-600-normal.woff2', 'fonts/barlow-latin-700-normal.woff2', 'fonts/barlow-condensed-latin-500-normal.woff2', 'fonts/barlow-condensed-latin-600-normal.woff2', 'fonts/barlow-condensed-latin-700-normal.woff2', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin && url.hostname.indexOf('gstatic') < 0 && url.hostname.indexOf('googleapis') < 0) return;
  var page = req.mode === 'navigate' || /index\.html$|\/$/.test(url.pathname);
  e.respondWith(caches.open(CACHE).then(function (c) {
    var key = page ? 'index.html' : req;
    var fresh = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(key, res.clone()); return res; });
    if (page) return fresh.catch(function () { return c.match('index.html'); });
    return c.match(req).then(function (hit) { return hit || fresh; });
  }));
});
