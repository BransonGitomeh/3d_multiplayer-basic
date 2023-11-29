// service-worker.js
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('your-app-cache').then(cache => {
            return cache.addAll([
                '/',
                '/manifest.json',
                // Add paths to other static assets (e.g., images, stylesheets)
            ]);
        })
    );
});

// Include this code in your service-worker.js file
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open('your-app-cache').then(cache => {
            return fetch(event.request).then(response => {
                cache.put(event.request, response.clone());
                return response;
            });
        })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

