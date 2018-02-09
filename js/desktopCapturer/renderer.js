'use strict';
const { remote, ipcRenderer } = require('electron');

renderDom();

let selectedSource;

/**
 * Method that renders application data
 */
function renderDom() {

}

ipcRenderer.on('sources', (event, sources) => {
    let screenContent = document.getElementById('screen-contents');
    let applicationContent = document.getElementById('application-contents');
    for (let source of sources) {
        screenContent.appendChild(createItem(source));
        applicationContent.appendChild(createItem(source));
    }
});

function sendSelectedSrc(sources, event) {
    ipcRenderer.send('source-selected', sources[0])
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
    itemContainer.classList.add('screen-item-container');
    sectionBox.classList.add('screen-section-box');
    imageTag.classList.add('img-wrapper');
    titleContainer.classList.add('screen-source-title');

    // Inject data to the dom element
    imageTag.src = source.thumbnail;
    titleContainer.innerText = source.name;

    sectionBox.appendChild(imageTag);
    itemContainer.appendChild(sectionBox);
    itemContainer.appendChild(titleContainer);

    itemContainer.addEventListener('click', sourceSelected.bind(this, source, itemContainer), false);

    return itemContainer;
}

function sourceSelected(source, itemContainer) {
    selectedSource = source;

    let shareButton = document.getElementById('share-button');
    shareButton.className = 'share-button';

    highlightSelectedSource();
    itemContainer.classList.add('selected');
}

function highlightSelectedSource() {
    let items = document.getElementsByClassName('screen-item-container');
    for (let i = 0, len = items.length; i < len; i++) {
        items[i].classList.remove('selected');
    }
}