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

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open('your-app-cache').then(cache => {
            // Attempt to fetch the resource from the cache
            return cache.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    // Resource found in cache, log and return the cached version
                    console.log('Cache hit:', event.request.url);
                    return cachedResponse;
                }

                // Resource not found in cache, log and fetch from the network
                console.log('Cache miss, fetching from network:', event.request.url);
                return fetch(event.request).then(response => {
                    // Cache the fetched resource for future use
                    console.log('Caching new resource:', event.request.url);
                    cache.put(event.request, response.clone());
                    return response;
                });
            });
        })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
