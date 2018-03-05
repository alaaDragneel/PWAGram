var functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')();
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
                response.status(201).json({message: 'Data Stored', id: request.body.id});
            })
            .catch(function (err) {
                response.status(500).json({error: err});
            });
    });
});
