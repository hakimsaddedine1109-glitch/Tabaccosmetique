// Service worker : met en cache les fichiers de l'appli et les librairies externes
// (Dexie, ZXing, polices) dès leur premier chargement, pour que tout fonctionne hors-ligne ensuite.

const CACHE_NAME = 'comptoir-pro-cache-v18';

const APP_SHELL = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  // Librairies critiques chargées depuis un CDN : sans elles l'appli ne démarre pas
  // (Dexie = toute la base de données). On les précache dès l'installation pour ne
  // plus dépendre d'un réseau fiable au moment précis où on ouvre un raccourci/l'app.
  'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js',
  'https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // On récupère chaque fichier un par un : si un seul échoue (CDN capricieux au
      // moment de l'install), ça ne doit pas empêcher la mise en cache des autres.
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Avant : si rien n'était en cache ET que le réseau échouait, on renvoyait
          // `undefined`, ce qui casse la requête (erreur "Failed to convert value to
          // Response") au lieu d'échouer proprement. Pour une navigation (ouverture
          // de page), on retombe sur la racine déjà précachée plutôt que de planter.
          if (event.request.mode === 'navigate') {
            return caches.match('./');
          }
          return Response.error();
        });
    })
  );
});
