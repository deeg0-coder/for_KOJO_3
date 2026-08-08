var CACHE_NAME = 'kojo-guide-v7';
var ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=7',
  './js/data.js?v=7',
  './js/accounts.js?v=7',
  './js/state.js?v=7',
  './js/sync.js?v=7',
  './js/app.js?v=7',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    }).then(function () {
      return self.clients.matchAll({ type: 'window' }).then(function (clients) {
        clients.forEach(function (client) { client.navigate(client.url); });
      });
    })
  );
});

function isCoreResource(request) {
  if (request.mode === 'navigate') return true;
  var url = request.url;
  return /\.(js|css)$/.test(url) || /\/index\.html$/.test(url);
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var request = event.request;

  if (isCoreResource(request)) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          }).catch(function () {});
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          }).catch(function () {});
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});