'use strict';
const { ipcRenderer } = require('electron');

const screenRegExp = new RegExp(/^Screen \d+$/gmi);
const PAGE_DOWN = 34,
    RIGHT_ARROW = 39,
    PAGE_UP = 33,
    LEFT_ARROW = 37,
    HOME_KEY = 36,
    UP_ARROW = 38,
    END_KEY = 35,
    ARROW_DOWN = 40,
    ENTER_KEY = 13,
    ESCAPE_KEY = 27;

let availableSources;
let selectedSource;
let currentIndex = -1;

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
        updateShareButtonText('Select Screen');
    }, false);

    applicationTab.addEventListener('click', () => {
        updateShareButtonText('Select Application');
    }, false);

    document.addEventListener('keyup', handleKeyUpPress.bind(this), true);

}

/**
 * Event emitted by main process with a list of available
 * Screens and Applications
 */
ipcRenderer.on('sources', (event, sources) => {
    availableSources = sources;

    const screenContent = document.getElementById('screen-contents');
    const applicationContent = document.getElementById('application-contents');
    const applicationTab = document.getElementById('applications');
    const screenTab = document.getElementById('screens');

    let hasScreens = false;
    let hasApplications = false;

    for (let source of sources) {
        screenRegExp.lastIndex = 0;
        if (source.name === 'Entire screen' || screenRegExp.exec(source.name)) {
            source.fileName = 'fullscreen';
            screenContent.appendChild(createItem(source));
            hasScreens = true;
        } else {
            source.fileName = null;
            applicationContent.appendChild(createItem(source));
            hasApplications = true;
        }
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
 * @param source
 * @returns {HTMLDivElement}
 */
function createItem(source) {
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
    titleContainer.innerText = source.name;

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
    shareButton.innerText = 'Share'
}

/**
 * Loops through the items and removes
 * the selected class property
 */
function highlightSelectedSource() {
    let items = document.getElementsByClassName('item-container');
    for (let i = 0, len = items.length; i < len; i++) {
        items[i].classList.remove('selected');
    }
}

/**
 * Method that updates the share button
 * text based on the content type
 * @param text
 */
function updateShareButtonText(text) {
    let shareButton = document.getElementById('share');

    if (shareButton && shareButton.classList[ 0 ] === 'share-button-disable') {
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
        case PAGE_DOWN:
        case RIGHT_ARROW:
            updateSelectedSource(1);
            break;
        case PAGE_UP:
        case LEFT_ARROW:
            updateSelectedSource(-1);
            break;
        case HOME_KEY:
            if (currentIndex !== 0) {
                updateSelectedSource(0);
            }
            break;
        case UP_ARROW:
            updateSelectedSource(1);
            break;
        case END_KEY:
            if (currentIndex !== availableSources.length - 1) {
                updateSelectedSource(availableSources.length - 1);
            }
            break;
        case ARROW_DOWN:
            updateSelectedSource(-1);
            break;
        case ENTER_KEY:
            startShare();
            break;
        case ESCAPE_KEY:
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
        currentIndex = availableSources.findIndex((source) => { return source.id === selectedElement.id });
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