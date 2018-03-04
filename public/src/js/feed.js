var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var sharedMomentsArea = document.querySelector('#shared-moments');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');

function openCreatePostModal() {
    createPostArea.style.display = 'block';
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
    createPostArea.style.display = 'none';
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

function clearCards () {
     while (sharedMomentsArea.hasChildNodes()) {
         sharedMomentsArea.removeChild(sharedMomentsArea.lastChild)
     }
}

function createCard() {
    var cardWrapper = document.createElement('div');
    cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
    var cardTitle = document.createElement('div');
    cardTitle.className = 'mdl-card__title';
    cardTitle.style.backgroundImage = 'url("/src/images/irre.jpg")';
    cardTitle.style.backgroundSize = 'cover';
    cardTitle.style.height = '180px';
    cardWrapper.appendChild(cardTitle);
    var cardTitleTextElement = document.createElement('h2');
    cardTitleTextElement.style.color = 'white';
    cardTitleTextElement.className = 'mdl-card__title-text';
    cardTitleTextElement.textContent = 'San Francisco Trip';
    cardTitle.appendChild(cardTitleTextElement);
    var cardSupportingText = document.createElement('div');
    cardSupportingText.className = 'mdl-card__supporting-text';
    cardSupportingText.textContent = 'In San Francisco';
    cardSupportingText.style.textAlign = 'center';
    // var cardSaveBtn = document.createElement('button');
    // cardSaveBtn.textContent = 'save';
    // cardSaveBtn.addEventListener('click', onSaveBtnClick)
    // cardSupportingText.appendChild(cardSaveBtn);
    cardWrapper.appendChild(cardSupportingText);
    componentHandler.upgradeElement(cardWrapper);
    sharedMomentsArea.appendChild(cardWrapper);
}

var url = 'https://httpbin.org/get';
var  networkDataRecieve = false;

fetch(url)
    .then(function(res) {
        return res.json();
    })
    .then(function(data) {
        networkDataRecieve = true;
        console.log('From Web: ', data);
        clearCards();
        createCard();
    })
    .catch(function (err) {
        console.log(err);
    });

if ('caches' in window) {
    caches.match(url)
        .then(function (response) {
            if (response) {
                return response.json();
            }
        })
        .then(function (data) {
            if (! networkDataRecieve) {
                console.log('From Cache: ', data);
                clearCards();
                createCard();
            }
        })
}
// function onSaveBtnClick(event) {
//     if ('caches' in window) {
//         caches.open('user-requested')
//             .then(function (cache) {
//                 cache.add('https://httpbin.org/get')
//                 cache.add('/src/images/irre.jpg')
//             });
//     }
// }