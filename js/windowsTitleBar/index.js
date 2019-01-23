const { ipcRenderer, remote } = require('electron');
const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;
const htmlContents = require('./contents');
const titleBarStyles = require('../enums/titleBarStyles');

// Default title bar height
const titleBarHeight = '32px';

class TitleBar {

    constructor() {
        this.window = remote.getCurrentWindow();
        this.domParser = new DOMParser();

        const titleBarParsed = this.domParser.parseFromString(htmlContents.titleBar, 'text/html');
        this.titleBar = titleBarParsed.getElementById('title-bar');
    }

    initiateWindowsTitleBar(titleBarStyle) {

        const actionItemsParsed = this.domParser.parseFromString(htmlContents.button, 'text/html');

        if (titleBarStyle === titleBarStyles.CUSTOM) {
            const buttons = actionItemsParsed.getElementsByClassName('action-items');

            let items = Array.from(buttons[0].children);
            for (let i of items) {
                this.titleBar.appendChild(i);
            }
        }

        const updateIcon = TitleBar.updateIcons;

        // Event to capture and update icons
        this.window.on('maximize', updateIcon.bind(this, true));
        this.window.on('unmaximize', updateIcon.bind(this, false));
        this.window.on('enter-full-screen', this.updateTitleBar.bind(this, true));
        this.window.on('leave-full-screen', this.updateTitleBar.bind(this, false));

        window.addEventListener('beforeunload', () => {
            this.window.removeListener('maximize', updateIcon);
            this.window.removeListener('unmaximize', updateIcon);
            this.window.removeListener('enter-full-screen', this.updateTitleBar);
            this.window.removeListener('leave-full-screen', this.updateTitleBar);
        });

        document.body.appendChild(this.titleBar);

        switch (titleBarStyle) {
            case titleBarStyles.CUSTOM:
                TitleBar.setTitleBarTitle();
                TitleBar.addWindowBorders();
                break;
            case titleBarStyles.NATIVE:
                TitleBar.hideTitleContainer();
                break;
            default:
                break;
        }
        this.hamburgerMenuButton = document.getElementById('hamburger-menu-button');
        this.minimizeButton = document.getElementById('title-bar-minimize-button');
        this.maximizeButton = document.getElementById('title-bar-maximize-button');
        this.closeButton = document.getElementById('title-bar-close-button');

        this.initiateEventListeners();

        this.updateTitleBar(this.window.isFullScreen());
    }

    /**
     * Method that attaches Event Listeners for elements
     */
    initiateEventListeners() {
        attachEventListeners(this.titleBar, 'dblclick', this.maximizeOrUnmaximize.bind(this));
        attachEventListeners(this.hamburgerMenuButton, 'click', this.popupMenu.bind(this));
        attachEventListeners(this.closeButton, 'click', this.closeWindow.bind(this));
        attachEventListeners(this.maximizeButton, 'click', this.maximizeOrUnmaximize.bind(this));
        attachEventListeners(this.minimizeButton, 'click', this.minimize.bind(this));
        attachEventListeners(this.minimizeButton, 'contextmenu', this.removeContextMenu.bind(this));
        attachEventListeners(this.maximizeButton, 'contextmenu', this.removeContextMenu.bind(this));
        attachEventListeners(this.closeButton, 'contextmenu', this.removeContextMenu.bind(this));

        attachEventListeners(this.hamburgerMenuButton, 'mousedown', TitleBar.handleMouseDown.bind(this));
        attachEventListeners(this.closeButton, 'mousedown', TitleBar.handleMouseDown.bind(this));
        attachEventListeners(this.maximizeButton, 'mousedown', TitleBar.handleMouseDown.bind(this));
        attachEventListeners(this.minimizeButton, 'mousedown', TitleBar.handleMouseDown.bind(this));
    }

    /**
     * Update button's title w.r.t current locale
     * @param content {Object}
     */
    updateLocale(content) {
        this.hamburgerMenuButton.title = content.Menu || 'Menu';
        this.minimizeButton.title = content.Minimize || 'Minimize';
        this.maximizeButton.title = content.Maximize || 'Maximize';
        this.closeButton.title = content.Close || 'Close';
    }

    /**
     * Method that remove context menu
     * ELECTRON-769: Hamburger Menu - Copy/ Reload in menu context displays when right 
     * clicking on minimize, maximize, close button of the hamburger menu
     *
     */
    // eslint-disable-next-line class-methods-use-this
    removeContextMenu(event) {
        event.preventDefault();
        return false;
    }

    /**
     * Method that adds borders
     */
    static addWindowBorders() {
        const borderBottom = document.createElement('div');
        borderBottom.className = 'bottom-window-border';

        document.body.appendChild(borderBottom);
        document.body.classList.add('window-border');
    }

    /**
     * Method that sets the title bar title
     * from document.title
     */
    static setTitleBarTitle() {
        const titleBarTitle = document.getElementById('title-bar-title');

        if (titleBarTitle) {
            titleBarTitle.innerText = document.title || 'Symphony';
        }
    }

    /**
     * Method that hides the title container
     * if the title bar style is NATIVE
     */
    static hideTitleContainer() {
        const titleContainer = document.getElementById('title-container');

        if (titleContainer) {
            titleContainer.style.visibility = 'hidden';
        }
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
     * Method that updates the title bar display property
     * based on the full screen event
     * @param isFullScreen {Boolean}
     */
    updateTitleBar(isFullScreen) {
        if (isFullScreen) {
            this.titleBar.style.display = 'none';
            updateContentHeight('0px');
        } else {
            this.titleBar.style.display = 'flex';
            updateContentHeight();
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

        if (!this.isValidWindow()) {
            return;
        }

        if (this.window.isMaximized()) {
            this.window.unmaximize();
        } else {
            this.window.maximize();
        }
    }

    /**
     * Method that closes the browser window
     */
    closeWindow() {
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

    /**
     * Prevent default to make sure buttons don't take focus
     * @param e
     */
    static handleMouseDown(e) {
        e.preventDefault();
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

/**
 * Method that adds margin property to the push
 * the client content below the title bar
 * @param height
 */
function updateContentHeight(height = titleBarHeight) {
    const contentWrapper = document.getElementById('content-wrapper');
    const titleBar = document.getElementById('title-bar');

    if (!titleBar) {
        return;
    }

    if (contentWrapper) {
        contentWrapper.style.marginTop = titleBar ? height : '0px';
        document.body.style.removeProperty('margin-top');
    } else {
        document.body.style.marginTop = titleBar ? height : '0px'
    }
}

module.exports = {
    TitleBar
};