var deferredPrompt;

if (! window.Promise) {
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