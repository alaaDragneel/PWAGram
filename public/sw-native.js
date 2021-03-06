importScripts('/src/js/idb.js');
importScripts('/src/js/idbHelpers.js');

var CACHE_STATIC_NAME = 'static-v13';
var CACHE_DYNAMIC_NAME = 'dynamic-v1';
var STATIC_FILES = [
    '/',
    '/index.html',
    '/offline.html',
    '/src/js/app.js',
    '/src/js/feed.js',
    '/src/js/idb.js',
    '/src/js/idbHelpers.js',
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
    var url = 'https://my-gram.firebaseio.com/posts';
    if (event.request.url.indexOf(url) > -1) {
        event.respondWith(
            fetch(event.request)
                .then(function (res) {
                    var clonedRes = res.clone();
                    clearAllData('posts')
                        .then(function () {
                            return clonedRes.json();
                        })
                        .then(function (data) {
                            for (var key in data) {
                                writeData('posts', data[key]);
                            }
                        });
                    return res;
                })
            // caches.open(CACHE_DYNAMIC_NAME)
            //     .then(function (cache) {
            //         return fetch(event.request)
            //             .then(function (res) {
            //                 // trimCache(CACHE_DYNAMIC_NAME, 3);
            //                 // cache.put(event.request, res.clone());
            //
            //                 return res;
            //             })
            //     })
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

self.addEventListener('sync', function (event) {
    console.log('[Server Worker] Background Syncing', event);
    if (event.tag === 'sync-new-post') {
        console.log('[Server Worker] Syncing New Post');
        event.waitUntil(
            readAllData('sync-posts')
                .then(function (data) {
                    for (var dt of data) {
                        var postData = new FormData();
                        postData.append('id', dt.id);
                        postData.append('title', dt.title);
                        postData.append('location', dt.location);
                        postData.append('file', dt.picture, dt.id + '.png');
                        postData.append('rawLocationLat', dt.rawLocation.lat);
                        postData.append('rawLocationLng', dt.rawLocation.lng);
                        fetch('https://us-central1-my-gram.cloudfunctions.net/storePostData', {
                            method: 'POST',
                            body: postData
                        })
                            .then(function (res) {
                                console.log('[Service Worker] Sending Data: ', res);
                                if (res.ok) {
                                    res.json()
                                        .then(function (resData) {
                                            deleteItemFromData('sync-posts', resData.id);
                                        });
                                }
                            })
                            .catch(function (err) {
                                console.log('Error While Sending The Data: ', err);
                            });
                    }
                })
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    var notification = event.notification;
    var action = event.action;
    console.log('Notification: ', notification);

    // notification id define in app.js === 'confirm'
    if (action === 'confirm') {
        console.log('Confirm Was Chosen');
        notification.close();
    } else {
        console.log('Action: ', action);
        event.waitUntil(
            clients.matchAll()
                .then(function (clis) {
                    var client = clis.find(function (c) {
                        return c.visibilityState = 'visible';
                    });

                    if (client !== undefined) {
                        client.navigate(notification.data.url); // found in push event on data option
                        client.focus();
                    } else {
                        clients.openWindow(notification.data.url); // found in push event on data option
                    }
                    notification.close();
                })
        );
    }
});

self.addEventListener('notificationclose', function (event) {
    console.log('Notification Was Closed', event);
});

self.addEventListener('push', function (event) {
    console.log('[Server Worker] Push Notification Received...', event);

    var data = { title: 'New!', content: 'Something New Happened!', openUrl: '/' };
    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.content,
        // not supported in all browsers but some support in devices Should Not Be Core Features
        icon: '/src/images/icons/app-icon-144x144.png',
        badge: '/src/images/icons/app-icon-96x96.png',
        data: {
            url: data.openUrl
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
