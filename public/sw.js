var CACHE_STATIC_NAME = 'static-v1';
var CACHE_DYNAMIC_NAME = 'dynamic-v1';
var STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/src/js/app.js',
    '/src/js/feed.js',
    '/src/js/promise.js',
    '/src/js/fetch.js',
    '/src/js/material.min.js',
    '/src/css/app.css',
    '/src/css/feed.css',
    'src/css/material.indigo-pink.min.css',
    '/src/images/Danganronpa-V3-Key-Art.jpg',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// function trimCache(cacheName, maxItems) {
//     caches.open(cacheName)
//         .then(function (cache) {
//             return cache.keys()
//                 .then(function (keys) {
//                     if (keys.length > maxItems) {
//                         cache.delete(keys[0])
//                             .then(trimCache(cacheName, maxItems));
//                     }
//                 });
//         });
// }

function isInArray(string, array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === string) {
            return true;
        }
    }
    return false;
}

self.addEventListener('install', function (event) {
    console.log('[Service Worker] Installing Service Worker ...', event);
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(function (cache) {
                console.log('[Service Worker] Precaching App Shell');
                cache.addAll(STATIC_FILES);
            })
    );
});

self.addEventListener('activate', function (event) {
    console.log('[Service Worker] Activating Service Worker ...', event);
    event.waitUntil(
        caches.keys()
            .then(function (keyList) {
                // Promise.all() return a list of promises
                return Promise.all(keyList.map(function (key) {
                    if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                        console.log('[Service Worker] Removing The Old Cache', key);
                        return caches.delete(key);
                    }
                }));
            })
    );
    return self.clients.claim();
});


self.addEventListener('fetch', function (event) {
    // cache than network strategy
    var url = 'https://httpbin.org/get';
    if (event.request.url.indexOf(url) > -1) {
        event.respondWith(
            caches.open(CACHE_DYNAMIC_NAME)
                .then(function (cache) {
                    return fetch(event.request)
                        .then(function (res) {
                            // trimCache(CACHE_DYNAMIC_NAME, 3);
                            cache.put(event.request, res.clone());
                            return res;
                        })
                })
        );
    } else if (isInArray(event.request.url, STATIC_FILES)) {
        // cache Only Strategy
        event.respondWith(
            caches.match(event.request)
        );
    } else {
        // cache with network fallback
        event.respondWith(
            caches.match(event.request)
                .then(function (response) {
                    if (response) {
                        // return response form the cache
                        return response;
                    } else {
                        // if the cache fail or not found try to get the response from the network
                        return fetch(event.request)
                            .then(function (res) {
                                // if the cache fail or not found try to get the response from the network
                                return caches.open(CACHE_DYNAMIC_NAME)
                                    .then(function (cache) {
                                        // res return one time so use clone to use twice [ more safety ]
                                        // trimCache(CACHE_DYNAMIC_NAME, 3);
                                        cache.put(event.request.url, res.clone());
                                        return res;
                                    });
                            })
                            // If The Network Response Fail
                            .catch(function (err) {
                                return caches.open(CACHE_STATIC_NAME).then(function (cache) {
                                    if (event.request.headers.get('accept').includes('text/html')) {
                                        return cache.match('/offline.html');
                                    }
                                });
                            });
                    }
                })
        );
    }
});

// self.addEventListener('fetch', function (event) {
//     // console.log('[Service Worker] Fetching Somethings ...', event);

// });