/*
 * Sprint.exe · service worker para que la app funcione sin conexión.
 * Siempre intenta la red primero (así nunca te quedas con una versión vieja)
 * y, si no hay conexión, tira de la última copia guardada.
 */
const CACHE = 'sprint-v3';
const BASICOS = ['./', './index.html', './style.css', './app.js', './logica.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((respuesta) => {
        // También se guardan las fuentes de Google (respuestas "opacas") para verlas sin conexión
        if (respuesta.ok || respuesta.type === 'opaque') {
          const copia = respuesta.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then((r) => r || caches.match('./index.html'))),
  );
});
