var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');
if (!window.Promise) {
    window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
    // .register('/sw.js', {scope: '/help/'})
        .register('/sw.js')
        .then(function () {
            console.log('Service Worker Registered!');
        });
}

/**
 * change the appearance period style of add to home prompt
 * @url https://developers.google.com/web/fundamentals/app-install-banners/
 */
window.addEventListener('beforeinstallprompt', function (event) {
    console.log('beforeinstallprompt fired');
    event.preventDefault();
    deferredPrompt = event;
    return false;
});

function displayConfirmNotification() {
    if ('serviceWorker' in navigator) {
        var options = {
            body: 'You successfully subscribed to our Notification service!',
            // not supported in all browsers but some support in devices Should Not Be Core Features
            icon: '/src/images/icons/app-icon-144x144.png',
            image: '/src/images/Danganronpa-V3-Key-Art.jpg',
            dir: 'ltr',
            lang: 'en-US', // BCP 47 Format
            vibrate: [100, 50, 200],
            badge: '/src/images/icons/app-icon-96x96.png',
            tag: 'confirm-notification', // very important
            renotify: true, // ver important to above line
            actions: [
                { action: 'confirm', title: 'Okay Baby', icon: '/src/images/icons/app-icon-96x96.png' },
                { action: 'cancel', title: 'Cancel Baby', icon: '/src/images/icons/app-icon-96x96.png' },
            ]
        };

        navigator.serviceWorker.ready
            .then(function (sw) {
                sw.showNotification('Successfully Subscribed!', options);
            });
    }
}

function configrePushSub() {
    if (! ('serviceWorker' in navigator) ) {
        return;
    }
    var reg;
    navigator.serviceWorker.ready
        .then(function (sw) {
            reg = sw;
            return sw.pushManager.getSubscription();
        })
        .then(function (sub) {
            if (sub === null) {
                // create ne subscription
                var vapidPublicKey = 'BBQygJQdBoyJlhc2pUswLoOfaX_mclXyLZw_gftpzdpEn3nJ7jcyZYAssEqD-FORjJWcouuslFYXWciKLI3E8WQ';
                var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey); // can found in idbHelpers.js
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidPublicKey
                });
            } else {
                // we have a subscription
            }
        })
        .then(function (newSub) {
            return fetch('https://my-gram.firebaseio.com/subscriptions.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(newSub)
            })
        })
        .then(function (res) {
            if (res.ok) {
                displayConfirmNotification();
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

function askForNotificationPermisssion() {
    Notification.requestPermission(function (result) {
        console.log('User Choice', result);
        if (result !== 'granted') {
            console.log('No Notification Permission Granted!');
        } else {
            configrePushSub();
            // displayConfirmNotification();
        }
    });
}

if ('Notification' in window && 'serviceWorker' in navigator) {
    for (var i = 0; i < enableNotificationsButtons.length; i++) {
        enableNotificationsButtons[i].style.display = 'inline-block';
        enableNotificationsButtons[i].addEventListener('click', askForNotificationPermisssion);
    }
}