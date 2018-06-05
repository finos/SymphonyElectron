'use strict';

//
// BrowserWindow preload script use to create notifications window for
// elctron-notify project.
//
// code here adapted from: https://www.npmjs.com/package/electron-notify
//
const electron = require('electron');
const ipc = electron.ipcRenderer;

const whiteColorRegExp = new RegExp(/^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i);
// event functions ref
let onMouseLeaveFunc;
let onMouseOverFunc;

/**
 * Sets style for a notification
 * @param config
 */
function setStyle(config) {
    // Style it
    let notiDoc = window.document;
    let container = notiDoc.getElementById('container');
    let header = notiDoc.getElementById('header');
    let image = notiDoc.getElementById('image');
    let logo = notiDoc.getElementById('symphony-logo');
    let title = notiDoc.getElementById('title');
    let company = notiDoc.getElementById('company');
    let message = notiDoc.getElementById('message');
    let close = notiDoc.getElementById('close');

    // Default style
    setStyleOnDomElement(config.defaultStyleContainer, container);

    let style = {
        height: config.height,
        width: config.width,
        borderRadius: config.borderRadius + 'px'
    };
    setStyleOnDomElement(style, container);

    setStyleOnDomElement(config.defaultStyleHeader, header);

    setStyleOnDomElement(config.defaultStyleImage, image);

    setStyleOnDomElement(config.defaultStyleLogo, logo);

    setStyleOnDomElement(config.defaultStyleTitle, title);

    setStyleOnDomElement(config.defaultStyleCompany, company);

    setStyleOnDomElement(config.defaultStyleText, message);

    setStyleOnDomElement(config.defaultStyleClose, close);
}

/**
 * Sets contents for a notification
 * @param event
 * @param notificationObj
 */
function setContents(event, notificationObj) {
    // sound
    if (notificationObj.sound) {
        // Check if file is accessible
        try {
            // If it's a local file, check it's existence
            // Won't check remote files e.g. http://
            if (notificationObj.sound.match(/^file:/) !== null
                || notificationObj.sound.match(/^\//) !== null) {
                let audio = new window.Audio(notificationObj.sound);
                audio.play()
            }
        } catch (e) {
            /* eslint-disable no-console */
            console.error('electron-notify: ERROR could not find sound file: '
            + notificationObj.sound.replace('file://', ''), e, e.stack);
            /* eslint-enable no-console */
        }
    }

    let notiDoc = window.document;

    // All the required DOM elements to update the content
    let container = notiDoc.getElementById('container');
    let titleDoc = notiDoc.getElementById('title');
    let companyDoc = notiDoc.getElementById('company');
    let messageDoc = notiDoc.getElementById('message');
    let imageDoc = notiDoc.getElementById('image');
    let closeButton = notiDoc.getElementById('close');

    if (notificationObj.color) {
        container.style.backgroundColor = notificationObj.color;
        let logo = notiDoc.getElementById('symphony-logo');

        if (notificationObj.color.match(whiteColorRegExp)) {
            logo.src = './assets/symphony-logo-black.png';
        } else {
            messageDoc.style.color = '#ffffff';
            titleDoc.style.color = '#ffffff';
            companyDoc.style.color = notificationObj.color;
            logo.src = './assets/symphony-logo-white.png';
        }
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
    titleDoc.innerText = notificationObj.title || '';

    // message
    messageDoc.innerText = notificationObj.text || '';

    // Image
    if (notificationObj.image) {
        imageDoc.src = notificationObj.image;
    } else {
        setStyleOnDomElement({ display: 'none'}, imageDoc);
    }

    // Company
    if (notificationObj.company) {
        companyDoc.innerText = notificationObj.company
    } else {
        messageDoc.style.marginTop = '15px';
    }

    const winId = notificationObj.windowId;

    if (!notificationObj.sticky) {
        onMouseLeaveFunc = onMouseLeave.bind(this);
        onMouseOverFunc = onMouseOver.bind(this);
        container.addEventListener('mouseleave', onMouseLeaveFunc);
        container.addEventListener('mouseover', onMouseOverFunc);
    }

    /**
     * Start a new timer to close the notification
     */
    function onMouseLeave() {
        ipc.send('electron-notify-mouseleave', winId, notificationObj);
    }

    /**
     * Clear all timeouts to prevent notification
     * from closing
     */
    function onMouseOver() {
        ipc.send('electron-notify-mouseover', winId);
    }

    // note: use onclick because we only want one handler, for case
    // when content gets overwritten by notf with same tag
    closeButton.onclick = function(clickEvent) {
        clickEvent.stopPropagation();
        ipc.send('electron-notify-close', winId, notificationObj)
    };

    container.onclick = function() {
        ipc.send('electron-notify-click', winId, notificationObj);
    }
}

/**
 * Sets style on a notification for a DOM element
 * @param styleObj
 * @param domElement
 */
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

window.addEventListener('keydown', handleKeyPress, true);
window.addEventListener('keyup', handleKeyPress, true);

/**
 * Method the prevent key stroke on notification window
 *
 * @param e  keydown event
 */
function handleKeyPress(e) {
    e.preventDefault();
}

/**
 * Loads the config
 * @param event
 * @param conf
 */
function loadConfig(event, conf) {
    setStyle(conf || {})
}

/**
 * Resets the notification window
 */
function reset() {
    let notiDoc = window.document;
    let container = notiDoc.getElementById('container');
    let closeButton = notiDoc.getElementById('close');

    // Remove event listener
    let newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    let newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);

    container.removeEventListener('mouseleave', onMouseLeaveFunc);
    container.removeEventListener('mouseover', onMouseOverFunc);
}

ipc.on('electron-notify-set-contents', setContents);
ipc.on('electron-notify-load-config', loadConfig);
ipc.on('electron-notify-reset', reset);
