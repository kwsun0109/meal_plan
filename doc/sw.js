self.addEventListener('install', (event) => {
  console.log('PWA Service Worker Installed');
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});