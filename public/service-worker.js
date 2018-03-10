importScripts('workbox-sw.prod.v2.1.3.js');
importScripts('/src/js/idb.js');
importScripts('/src/js/idbHelpers.js');

const workboxSW = new self.WorkboxSW();

/**
 * strategies => how work
 * staleWhileRevalidate => go to cache first and then go to make request if not found in cache or there is a new version
 */

workboxSW.router.registerRoute(/.*(?:googleapis|gstatic)\.com.*$/,
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'google-fonts',
        cacheExpiration: {
            maxEntries: 3,
            maxAgeSeconds: 60 * 60 * 24 * 30
        },
    }));

workboxSW.router.registerRoute('https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css',
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'material-css'
    }));

workboxSW.router.registerRoute(/.*(?:firebasestorage\.googleapis)\.com.*$/,
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'post-images'
    }));

workboxSW.router.registerRoute('https://my-gram.firebaseio.com/posts.json', function (args) {
    return fetch(args.event.request)
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
        });
});

workboxSW.router.registerRoute(function (routeData) {
return (routeData.event.request.headers.get('accept').includes('text/html'));
}, function (args) {
    return caches.match(args.event.request)
    .then(function (response) {
        if (response) {
            // return response form the cache
            return response;
        } else {
            // if the cache fail or not found try to get the response from the network
            return fetch(args.event.request)
                .then(function (res) {
                    // if the cache fail or not found try to get the response from the network
                    return caches.open('dynamic')
                        .then(function (cache) {
                            cache.put(args.event.request.url, res.clone());
                            return res;
                        });
                })
                // If The Network Response Fail
                .catch(function (err) {
                    return caches.match('/offline.html')
                    .then(function (res) {
                        return res;
                    });
                });
        }
    })
});

workboxSW.precache([
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "6a7c71902904480c3a994cb0578f3eba"
  },
  {
    "url": "manifest.json",
    "revision": "cb029ded77fe94c2f8393f9208706c85"
  },
  {
    "url": "offline.html",
    "revision": "93e91ed15bcd7e5f27ef6bf4f41325d8"
  },
  {
    "url": "src/css/app.css",
    "revision": "0ba434741e4a6f42c44a6f8becd45cda"
  },
  {
    "url": "src/css/feed.css",
    "revision": "a7fb2ae11aae51f32b4e74c82d111447"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/css/material.indigo-pink.min.css",
    "revision": "93e7c1df412f17889e6b676eec1a2cd5"
  },
  {
    "url": "src/images/Danganronpa-V3-Key-Art.jpg",
    "revision": "32031846cc67853a093d9314e37971c2"
  },
  {
    "url": "src/images/irre.jpg",
    "revision": "c457d763a74297db8bc22eb2d7fd5f10"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/js/app.min.js",
    "revision": "a8b4ddfcfed77d46353d63952c06f446"
  },
  {
    "url": "src/js/feed.min.js",
    "revision": "c51b5975e87b320873f18f2e2060bc34"
  },
  {
    "url": "src/js/fetch.min.js",
    "revision": "f5cdc3ed2164132ed58641078b20c220"
  },
  {
    "url": "src/js/idb.min.js",
    "revision": "88ae80318659221e372dd0d1da3ecf9a"
  },
  {
    "url": "src/js/idbHelpers.min.js",
    "revision": "58360163a32a9d171805bfe1d40985c9"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.min.js",
    "revision": "d4c70d4f5bc179792a380942e5c5137e"
  }
]);

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