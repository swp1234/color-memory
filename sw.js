/**
 * Service Worker for Color Memory Game
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'color-memory-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/i18n.js',
    './js/locales/ko.json',
    './js/locales/en.json',
    './js/locales/zh.json',
    './js/locales/hi.json',
    './js/locales/ru.json',
    './js/locales/ja.json',
    './js/locales/es.json',
    './js/locales/pt.json',
    './js/locales/id.json',
    './js/locales/tr.json',
    './js/locales/de.json',
    './js/locales/fr.json',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache).catch(error => {
                console.warn('Cache addAll failed:', error);
                // Continue even if some assets fail to cache
            });
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests and analytics
    if (event.request.url.includes('googletagmanager') ||
        event.request.url.includes('googlesyndication') ||
        event.request.url.includes('pagead2.google') ||
        !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            // Return cached version if available
            if (response) {
                return response;
            }

            // Otherwise, fetch from network
            return fetch(event.request).then(response => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                // Cache the fetched response for future use
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            }).catch(() => {
                // Return a custom offline page if available
                return caches.match('./index.html');
            });
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
