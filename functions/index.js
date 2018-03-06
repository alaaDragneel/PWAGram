var functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')();
var webpush = require('web-push');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
var serviceAccount = require("./alaa-gram-fb-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://alaa-gram.firebaseio.com"
});
exports.storePostData = functions.https.onRequest(function (request, response) {
    cors(request, response, function () {
        admin.database().ref('posts').push({
            id: request.body.id,
            title: request.body.title,
            location: request.body.location,
            image: request.body.image
        })
            .then(function () {
                webpush.setVapidDetails(
                    'mailto:moaalaa16@gmail.com',
                    'BBQygJQdBoyJlhc2pUswLoOfaX_mclXyLZw_gftpzdpEn3nJ7jcyZYAssEqD-FORjJWcouuslFYXWciKLI3E8WQ',
                    'wB1aNewEb1FixI1ONdfzl4MDxT-PgWLI-gBJVVtxMtA'
                );
                return admin.database().ref('subscriptions').once('value');
            })
            .then(function (subscription) {
                subscription.forEach(function (sub) {
                    var pushConfig = {
                        endpoint: sub.val().endpoint,
                        keys: {
                            auth: sub.val().keys.auth,
                            p256dh: sub.val().keys.p256dh,
                        }
                    };
                    webpush.sendNotification(pushConfig, JSON.stringify({
                            title: 'New Post',
                            content: 'New Post Added!',
                            openUrl: '/'
                        }))
                        .catch(function (err) {
                            console.log('err');
                        })
                });
                response.status(201).json({message: 'Data Stored', id: request.body.id});
            })
            .catch(function (err) {
                response.status(500).json({error: err});
            });
    });
});
