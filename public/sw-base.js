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

workboxSW.precache([]);

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