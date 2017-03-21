'use strict'

//
// BrowserWindow preload script use to create notifications window for
// elctron-notify project.
//
// code here adapted from: https://www.npmjs.com/package/electron-notify
//
const electron = require('electron');
const ipc = electron.ipcRenderer;

function setStyle(config) {
    // Style it
    let notiDoc = window.document;
    let container = notiDoc.getElementById('container');
    let header = notiDoc.getElementById('header');
    let image = notiDoc.getElementById('image');
    let title = notiDoc.getElementById('title');
    let message = notiDoc.getElementById('message');
    let close = notiDoc.getElementById('close');

    // Default style
    setStyleOnDomElement(config.defaultStyleContainer, container)

    // Size and radius
    let style = {
        height: config.height - 2 * config.borderRadius - 2 * config.defaultStyleContainer.padding,
        width: config.width - 2 * config.borderRadius - 2 * config.defaultStyleContainer.padding,
        borderRadius: config.borderRadius + 'px'
    }
    setStyleOnDomElement(style, container)

    setStyleOnDomElement(config.defaultStyleHeader, header);

    setStyleOnDomElement(config.defaultStyleImage, image);

    setStyleOnDomElement(config.defaultStyleTitle, title);

    setStyleOnDomElement(config.defaultStyleText, message);

    setStyleOnDomElement(config.defaultStyleClose, close);
}

function setContents(notificationObj) {
    // sound
    if (notificationObj.sound) {
        // Check if file is accessible
        try {
            // If it's a local file, check it's existence
            // Won't check remote files e.g. http://
            if (notificationObj.sound.match(/^file:/) !== null
                || notificationObj.sound.match(/^\//) !== null) {
                let audio = new window.Audio(notificationObj.sound)
                audio.play()
            }
        } catch (e) {
            log('electron-notify: ERROR could not find sound file: ' + notificationObj.sound.replace('file://', ''), e, e.stack)
        }
    }

    let notiDoc = window.document

    let container = notiDoc.getElementById('container');

    if (notificationObj.color) {
        container.style.backgroundColor = notificationObj.color;
    }

    if (notificationObj.flash) {
        let origColor = container.style.backgroundColor;
        setInterval(function() {
            if (container.style.backgroundColor === 'red') {
                container.style.backgroundColor = origColor;
            } else {
                container.style.backgroundColor = 'red';
            }
        }, 1000);
    }

    // Title
    let titleDoc = notiDoc.getElementById('title')
    titleDoc.innerHTML = notificationObj.title || ''

    // message
    let messageDoc = notiDoc.getElementById('message')
    messageDoc.innerHTML = notificationObj.text || ''

    // Image
    let imageDoc = notiDoc.getElementById('image')
    if (notificationObj.image) {
        imageDoc.src = notificationObj.image
    } else {
        setStyleOnDomElement({ display: 'none'}, imageDoc)
    }

    const winId = notificationObj.windowId;

    // Close button
    let closeButton = notiDoc.getElementById('close')
    closeButton.addEventListener('click', function(clickEvent) {
        clickEvent.stopPropagation()
        ipc.send('electron-notify-close', winId, notificationObj)
    })

    // URL
    container.addEventListener('click', function() {
        ipc.send('electron-notify-click', winId, notificationObj)
    })
}

function setStyleOnDomElement(styleObj, domElement) {
    try {
        let styleAttr = Object.keys(styleObj);
        styleAttr.forEach(function(attr) {
            /* eslint-disable */
            domElement.style[attr] = styleObj[attr];
            /* eslint-enable */
        });
    } catch (e) {
        throw new Error('electron-notify: Could not set style on domElement', styleObj, domElement)
    }
}

function loadConfig(conf) {
    setStyle(conf || {})
}

function reset() {
    let notiDoc = window.document
    let container = notiDoc.getElementById('container')
    let closeButton = notiDoc.getElementById('close')

    // Remove event listener
    let newContainer = container.cloneNode(true)
    container.parentNode.replaceChild(newContainer, container)
    let newCloseButton = closeButton.cloneNode(true)
    closeButton.parentNode.replaceChild(newCloseButton, closeButton)
}

ipc.on('electron-notify-set-contents', setContents)
ipc.on('electron-notify-load-config', loadConfig)
ipc.on('electron-notify-reset', reset)

function log() {
    /* eslint-disable no-console */
    console.log.apply(console, arguments)
    /* eslint-enable no-console */
}
