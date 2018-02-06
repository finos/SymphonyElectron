const { ipcRenderer, remote } = require('electron');
const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;
const htmlContents = require('./contents');
const { isWindows10 } = require('./../utils/misc');

class TitleBar {

    constructor() {
        this.window = remote.getCurrentWindow();
        this.domParser = new DOMParser();
    }

    initiateWindowsTitleBar() {

        if (!isWindows10()) {
            return;
        }

        const titleBarParsed = this.domParser.parseFromString(htmlContents.titleBar, 'text/html');
        const actionItemsParsed = this.domParser.parseFromString(htmlContents.button, 'text/html');

        const titleBar = titleBarParsed.getElementById('title-bar');
        const buttons = actionItemsParsed.getElementsByClassName('action-items');

        let items = Array.from(buttons[0].children);
        for (let i of items) {
            titleBar.appendChild(i);
        }

        // Event to capture and update icons
        this.window.on('maximize', TitleBar.updateIcons.bind(this, true));
        this.window.on('enter-full-screen', TitleBar.updateIcons.bind(this, true));
        this.window.on('unmaximize', TitleBar.updateIcons.bind(this, false));
        this.window.on('leave-full-screen', TitleBar.updateIcons.bind(this, false));

        document.body.appendChild(titleBar);
        document.body.style.marginTop = '31px';
        this.initiateEventListeners();
    }

    /**
     * Method that attaches Event Listeners for elements
     */
    initiateEventListeners() {
        const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
        const minimizeButton = document.getElementById('title-bar-minimize-button');
        const maximizeButton = document.getElementById('title-bar-maximize-button');
        const closeButton = document.getElementById('title-bar-close-button');

        attachEventListeners(hamburgerMenuButton, 'click', this.popupMenu.bind(this));
        attachEventListeners(closeButton, 'click', this.closeButtonClick.bind(this));
        attachEventListeners(maximizeButton, 'click', this.maximizeOrUnmaximize.bind(this));
        attachEventListeners(minimizeButton, 'click', this.minimize.bind(this));
    }

    /**
     * Method that updates the state of the maximize or
     * unmaximize icons
     * @param isMaximized
     */
    static updateIcons(isMaximized) {
        const button = document.getElementById('title-bar-maximize-button');

        if (!button) {
            return
        }

        if (isMaximized) {
            button.innerHTML = htmlContents.unMaximizeButton;
        } else {
            button.innerHTML = htmlContents.maximizeButton;
        }
    }

    /**
     * Method that popup the application menu
     */
    popupMenu() {
        if (this.isValidWindow()) {
            ipcRenderer.send(apiName, {
                cmd: apiCmds.popupMenu
            });
        }
    }

    /**
     * Method that minimizes browser window
     */
    minimize() {
        if (this.isValidWindow()) {
            this.window.minimize();
        }
    }

    /**
     * Method that maximize or unmaximize browser window
     */
    maximizeOrUnmaximize() {
        if (this.isValidWindow() && this.window.isMaximized()) {
            this.window.unmaximize();
        } else {
            this.window.maximize();
        }
    }

    /**
     * Method that closes the browser window
     */
    closeButtonClick() {
        if (this.isValidWindow()) {
            this.window.close();
        }
    }

    /**
     * Verifies if the window exists and is not destroyed
     * @returns {boolean}
     */
    isValidWindow() {
        return !!(this.window && !this.window.isDestroyed());
    }
}

/**
 * Will attach event listeners for a given element
 * @param element
 * @param eventName
 * @param func
 */
function attachEventListeners(element, eventName, func) {

    if (!element || !eventName) {
        return;
    }

    eventName.split(" ").forEach((name) => {
        element.addEventListener(name, func, false);
    });
}

module.exports = {
    TitleBar
};