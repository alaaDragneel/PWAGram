var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var sharedMomentsArea = document.querySelector('#shared-moments');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var videoPlayer = document.querySelector('#player');
var canvas = document.querySelector('#canvas');
var captureBtn = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var picture;
var locationBtn = document.querySelector('#location-btn');
var locationLoader = document.querySelector('#location-loader');
var fetchLocation = { lat: 0, lng: 0 };

locationBtn.addEventListener('click', function (event) {
    if (!('geolocation' in navigator)) {
        return;
    }

    locationBtn.style.display = 'none';
    locationLoader.style.display = 'block';

    navigator.geolocation.getCurrentPosition(function (position) {
        locationBtn.style.display = 'inline';
        locationLoader.style.display = 'none';
        fetchLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        locationInput.value = "In Imbaba";
        document.querySelector('#manual-location').classList.add('is-focused');
    }, function (err) {
        console.log(err);
        locationBtn.style.display = 'inline';
        locationLoader.style.display = 'none';
        fetchLocation = { lat: 0, lng: 0 };
    }, { timeout: 7000 });
});

function initMedia() {
    if (!('mediaDevices' in navigator)) {
        navigator.mediaDevices = {};
    }

    if (!('getUserMedia' in navigator.mediaDevices)) {
        navigator.mediaDevices.getUserMedia = function (constraints) {
            var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            

            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia Is Not Implemented!'));
            }

            return new Promise(function (resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        };
    }
    // { video: true, audio: true } => constants
    navigator.mediaDevices.getUserMedia({video: true})
        .then(function (stream) {
            videoPlayer.srcObject = stream;
            videoPlayer.style.display = 'block';
        })
        .catch(function (err) {
            imagePickerArea.style.display = 'block';
        });
}

function initLocation() {   
    if (! ('geolocation' in navigator)) {
        locationBtn.style.display = 'none';
    }
}

captureBtn.addEventListener('click', function (event) {
    canvas.style.display = 'block';
    videoPlayer.style.display = 'none';
    captureBtn.style.display = 'none';
    var context = canvas.getContext('2d');
    context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width));
    videoPlayer.srcObject.getVideoTracks().forEach(function (track) {
        track.stop();
    });

    picture = dataURItoBlob(canvas.toDataURL());
});

imagePicker.addEventListener('change', function (event) {
   picture = event.target.files[0];
});

function openCreatePostModal() {
    setTimeout(function () {
        createPostArea.style.transform = 'translateY(0)';
    }, 1);
    initMedia();
    initLocation();
    // check if the prompt is found NOTE can Found In app.js
    if (deferredPrompt) {
        // prompt
        deferredPrompt.prompt();
        // get user choice
        deferredPrompt.userChoice.then(function (choiceResult) {
            console.log(choiceResult.outcome);

            if (choiceResult.outcome == 'dismissed') {
                console.log('User Cancelled Installation');
            } else {
                console.log('User Added To Home Screen');
            }
        });
        deferredPrompt = null;
    }
}

function closeCreatePostModal() {
    videoPlayer.style.display = 'none';
    imagePickerArea.style.display = 'none';
    canvas.style.display = 'none';
    captureBtn.style.display = 'block';
    locationBtn.style.display = 'inline';
    locationLoader.style.display = 'none';
    if (videoPlayer.srcObject) {
        videoPlayer.srcObject.getVideoTracks().forEach(function (track) {
            track.stop();
        });
    }
    setTimeout(function () {
        createPostArea.style.transform = 'translateY(100vh)';
    }, 1);
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

function clearCards() {
    while (sharedMomentsArea.hasChildNodes()) {
        sharedMomentsArea.removeChild(sharedMomentsArea.lastChild)
    }
}

function createCard(data) {
    var cardWrapper = document.createElement('div');
    cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
    var cardTitle = document.createElement('div');
    cardTitle.className = 'mdl-card__title';
    cardTitle.style.backgroundImage = 'url(' + data.image + ')';
    cardTitle.style.backgroundSize = 'cover';
    cardWrapper.appendChild(cardTitle);
    var cardTitleTextElement = document.createElement('h2');
    cardTitleTextElement.style.color = 'white';
    cardTitleTextElement.className = 'mdl-card__title-text';
    cardTitleTextElement.textContent = data.title;
    cardTitle.appendChild(cardTitleTextElement);
    var cardSupportingText = document.createElement('div');
    cardSupportingText.className = 'mdl-card__supporting-text';
    cardSupportingText.textContent = data.location;
    cardSupportingText.style.textAlign = 'center';
    // var cardSaveBtn = document.createElement('button');
    // cardSaveBtn.textContent = 'save';
    // cardSaveBtn.addEventListener('click', onSaveBtnClick)
    // cardSupportingText.appendChild(cardSaveBtn);
    cardWrapper.appendChild(cardSupportingText);
    componentHandler.upgradeElement(cardWrapper);
    sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
    clearCards();
    for (var i = 0; i < data.length; i++) {
        createCard(data[i]);
    }
}

var url = 'https://my-gram.firebaseio.com/posts.json';
var networkDataRecieve = false;

fetch(url)
    .then(function (res) {
        return res.json();
    })
    .then(function (data) {
        networkDataRecieve = true;
        console.log('From Web: ', data);
        var dataArray = [];
        for (var key in data) {
            dataArray.push(data[key]);
        }
        updateUI(dataArray);
    })
    .catch(function (err) {
        console.log(err);
    });

if ('indexedDB' in window) {
    readAllData('posts')
        .then(function (data) {
            if (!networkDataRecieve) {
                console.log('From Cache IndexedDB: ', data);
                updateUI(data);
            }
        });
}

// if ('caches' in window) {
//     caches.match(url)
//         .then(function (response) {
//             if (response) {
//                 return response.json();
//             }
//         })
//         .then(function (data) {
//             if (!networkDataRecieve) {
//                 console.log('From Cache: ', data);
//                 var dataArray = [];
//                 for (var key in data) {
//                     dataArray.push(data[key]);
//                 }
//                 updateUI(dataArray);
//             }
//         })
// }

// function onSaveBtnClick(event) {
//     if ('caches' in window) {
//         caches.open('user-requested')
//             .then(function (cache) {
//                 cache.add('https://httpbin.org/get')
//                 cache.add('/src/images/irre.jpg')
//             });
//     }
// }

function sendData() {
    var id = new Date().toISOString();
    var postData = new FormData();
    postData.append('id', id);
    postData.append('title', titleInput.value);
    postData.append('location', locationInput.value);
    postData.append('file', picture, id + '.png');
    postData.append('rawLocationLat', fetchLocation.lat);
    postData.append('rawLocationLng', fetchLocation.lng);

    fetch('https://us-central1-my-gram.cloudfunctions.net/storePostData', {
        method: 'POST',
        body: postData
    })
        .then(function (res) {
            console.log('Send Data: ', res);
            updateUI();
        });
}

form.addEventListener('submit', function (event) {
    console.log('submitted');
    
    event.preventDefault();

    if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
        alert('Please Enter Valid Data!');
        return;
    }
    closeCreatePostModal();

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
            .then(function (sw) {
                var post = {
                    id: new Date().toISOString(),
                    title: titleInput.value,
                    location: locationInput.value,
                    picture: picture,
                    rawLocation: fetchLocation
                };
                console.log(post);
                
                writeData('sync-posts', post)
                    .then(function () {
                        return sw.sync.register('sync-new-post');
                    })
                    .then(function () {
                        var snackbarContainer = document.querySelector('#confirmation-toast');
                        var data = {message: 'Your Post Was Saved For Syncing!'};
                        snackbarContainer.MaterialSnackbar.showSnackbar(data);
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            });
    } else {
        sendData();
    }
});