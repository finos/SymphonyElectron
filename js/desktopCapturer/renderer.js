'use strict';
const { ipcRenderer, crashReporter } = require('electron');

const screenRegExp = new RegExp(/^Screen \d+$/gmi);

// All the required Keyboard keyCode events
const keyCodeEnum = Object.freeze({
    pageDown: 34,
    rightArrow: 39,
    pageUp: 33,
    leftArrow: 37,
    homeKey: 36,
    upArrow: 38,
    endKey: 35,
    arrowDown: 40,
    enterKey: 13,
    escapeKey: 27
});

let availableSources;
let selectedSource;
let currentIndex = -1;
let localizedContent;

document.addEventListener('DOMContentLoaded', () => {
    renderDom();
});

/**
 * Method that renders application data
 */
function renderDom() {
    const applicationTab = document.getElementById('application-tab');
    const screenTab = document.getElementById('screen-tab');
    const share = document.getElementById('share');
    const cancel = document.getElementById('cancel');
    const xButton = document.getElementById('x-button');

    // Event listeners
    xButton.addEventListener('click', () => {
        closeScreenPickerWindow();
    }, false);

    share.addEventListener('click', () => {
        startShare();
    }, false);

    cancel.addEventListener('click', () => {
        closeScreenPickerWindow();
    }, false);

    screenTab.addEventListener('click', () => {
        updateShareButtonText(localizedContent && localizedContent[ 'Select Screen' ] ?
            localizedContent[ 'Select Screen' ] :
            'Select Screen');
    }, false);

    applicationTab.addEventListener('click', () => {
        updateShareButtonText(localizedContent && localizedContent[ 'Select Application' ] ?
            localizedContent[ 'Select Application' ] :
            'Select Application');
    }, false);

    document.addEventListener('keyup', handleKeyUpPress.bind(this), true);

}

/**
 * Event emitted by main process with a list of available
 * Screens and Applications
 */
ipcRenderer.on('desktop-capturer-sources', (event, sources, isWindowsOS) => {

    if (!Array.isArray(sources) && typeof isWindowsOS !== 'boolean') {
        return;
    }
    availableSources = sources;

    if (isWindowsOS) {
        document.body.classList.add('window-border');
    }

    const screenContent = document.getElementById('screen-contents');
    const applicationContent = document.getElementById('application-contents');
    const applicationTab = document.getElementById('applications');
    const screenTab = document.getElementById('screens');

    let hasScreens = false;
    let hasApplications = false;

    for (let source of sources) {
        screenRegExp.lastIndex = 0;
        if (source.display_id !== "") {
            source.fileName = 'fullscreen';
            if (source.name === 'Entire screen') {
                const screenName = localizedContent['Entire screen'] || 'Entire screen';
                screenContent.appendChild(createItem(source, screenName));
            } else {
                const screenName = localizedContent['Screen {number}'] || 'Screen {number}';
                const screenNumber = source.name.substr(7, source.name.length);
                const localisedScreenString = screenName.replace('{number}', screenNumber);
                screenContent.appendChild(createItem(source, localisedScreenString));
            }
            hasScreens = true;
        } else {
            source.fileName = null;
            applicationContent.appendChild(createItem(source, source.name));
            hasApplications = true;
        }
    }

    if (!hasScreens && !hasApplications) {
        const errorContent = document.getElementById('error-content');
        const mainContent = document.getElementById('main-content');

        errorContent.style.display = 'block';
        mainContent.style.display = 'none';
    }

    if (hasApplications) {
        applicationTab.classList.remove('hidden');
    }

    if (hasScreens) {
        screenTab.classList.remove('hidden');
    }
});

function startShare() {
    if (selectedSource && selectedSource.id) {
        ipcRenderer.send('share-selected-source', selectedSource);
        closeScreenPickerWindow();
    }
}

/**
 * Creates DOM elements and injects data
 * @param source Screen source
 * @param name Name of the source
 * @returns {HTMLDivElement}
 */
function createItem(source, name) {
    const itemContainer = document.createElement("div");
    const sectionBox = document.createElement("div");
    const imageTag = document.createElement("img");
    const titleContainer = document.createElement("div");

    // Added class names to the dom elements
    itemContainer.classList.add('item-container');
    sectionBox.classList.add('screen-section-box');
    imageTag.classList.add('img-wrapper');
    titleContainer.classList.add('screen-source-title');

    // Inject data to the dom element
    imageTag.src = source.thumbnail;
    titleContainer.innerText = name;

    sectionBox.appendChild(imageTag);
    itemContainer.id = source.id;
    itemContainer.appendChild(sectionBox);
    itemContainer.appendChild(titleContainer);

    itemContainer.addEventListener('click', updateUI.bind(this, source, itemContainer), false);

    return itemContainer;
}

/**
 * When ever user select a source store it and update the UI
 * @param source
 * @param itemContainer
 */
function updateUI(source, itemContainer) {
    selectedSource = source;

    let shareButton = document.getElementById('share');
    shareButton.className = 'share-button';

    highlightSelectedSource();
    itemContainer.classList.add('selected');
    shareButton.innerText = localizedContent && localizedContent.Share ? localizedContent.Share : 'Share';
}

/**
 * Loops through the items and removes
 * the selected class property
 */
function highlightSelectedSource() {
    let items = document.getElementsByClassName('item-container');
    for (const item of items) {
        item.classList.remove('selected');
    }
}

/**
 * Method that updates the share button
 * text based on the content type
 * @param text
 */
function updateShareButtonText(text) {
    let shareButton = document.getElementById('share');

    if (shareButton && shareButton.classList[0] === 'share-button-disable') {
        shareButton.innerText = text;
    }
}

/**
 * Method handles used key up event
 * @param e
 */
function handleKeyUpPress(e) {
    const keyCode = e.keyCode || e.which;

    switch (keyCode) {
        case keyCodeEnum.pageDown:
        case keyCodeEnum.rightArrow:
            updateSelectedSource(1);
            break;
        case keyCodeEnum.pageUp:
        case keyCodeEnum.leftArrow:
            updateSelectedSource(-1);
            break;
        case keyCodeEnum.homeKey:
            if (currentIndex !== 0) {
                updateSelectedSource(0);
            }
            break;
        case keyCodeEnum.upArrow:
            updateSelectedSource(-2);
            break;
        case keyCodeEnum.endKey:
            if (currentIndex !== availableSources.length - 1) {
                updateSelectedSource(availableSources.length - 1);
            }
            break;
        case keyCodeEnum.arrowDown:
            updateSelectedSource(2);
            break;
        case keyCodeEnum.enterKey:
            startShare();
            break;
        case keyCodeEnum.escapeKey:
            closeScreenPickerWindow();
            break;
        default:
            break;
    }
}

/**
 * Updates UI based on the key press
 * @param index
 */
function updateSelectedSource(index) {

    let selectedElement = document.getElementsByClassName('selected')[0];
    if (selectedElement) {
        currentIndex = availableSources.findIndex((source) => {
            return source.id === selectedElement.id
        });
    }

    // Find the next item to be selected
    let nextIndex = (currentIndex + index + availableSources.length) % availableSources.length;
    if (availableSources[nextIndex] && availableSources[nextIndex].id) {
        let item = document.getElementById(availableSources[nextIndex] ? availableSources[nextIndex].id : "");

        if (item) {
            // Method that stores and update the selected source
            updateUI(availableSources[nextIndex], item);
        }
    }
}

/**
 * Closes the screen picker window
 */
function closeScreenPickerWindow() {
    document.removeEventListener('keyUp', handleKeyUpPress.bind(this), true);
    ipcRenderer.send('close-screen-picker');
}

ipcRenderer.on('register-crash-reporter', (event, arg) => {
    if (arg && typeof arg === 'object') {
        crashReporter.start(arg);
    }
});

ipcRenderer.on('i18n-screen-picker', (event, content) => {
    localizedContent = content;
    if (content && typeof content === 'object') {
        const i18nNodes = document.querySelectorAll('[data-i18n-text]');

        for (let node of i18nNodes) {
            if (node.attributes['data-i18n-text'] && node.attributes['data-i18n-text'].value) {
                node.innerText = content[node.attributes['data-i18n-text'].value] || node.attributes['data-i18n-text'].value;
            }
        }
    }
});


// note: this is a workaround until
// https://github.com/electron/electron/issues/8841
// is fixed on the electron. where 'will-navigate'
// is never fired in sandbox mode
//
// This is required in order to prevent from loading
// dropped content
window.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
});

window.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
});