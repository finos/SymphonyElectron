'use strict';

const fs = require('fs');
const electron = require('electron');

const { updateConfigField, getMultipleConfigField, readConfigFromFile } = require('../config.js');
const { isMac, isWindowsOS } = require('../utils/misc.js');
const archiveHandler = require('../utils/archiveHandler');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const eventEmitter = require('../eventEmitter');
const aboutApp = require('../aboutApp');
const moreInfo = require('../moreInfo');
const titleBarStyles = require('../enums/titleBarStyles');
const i18n = require('../translation/i18n');
const autoLaunch = require('../autoLaunch');

const configFields = [
    'minimizeOnClose',
    'launchOnStartup',
    'alwaysOnTop',
    'notificationSettings',
    'bringToFront',
    'memoryRefresh',
    'isCustomTitleBar'
];

let minimizeOnClose = false;
let launchOnStartup = false;
let isAlwaysOnTop = false;
let bringToFront = false;
let memoryRefresh = false;
let titleBarStyle = titleBarStyles.CUSTOM;

const windowsAccelerator = Object.assign({
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    cut: 'Ctrl+X',
    copy: 'Ctrl+C',
    paste: 'Ctrl+V',
    pasteandmatchstyle: 'Ctrl+Shift+V',
    selectall: 'Ctrl+A',
    resetzoom: 'Ctrl+0',
    zoomin: 'Ctrl+Shift+Plus',
    zoomout: 'Ctrl+-',
    togglefullscreen: 'F11',
    minimize: 'Ctrl+M',
    close: 'Ctrl+W',
});

function getTemplate(app) {

    const template = [{
        label: i18n.getMessageFor('Edit'),
        submenu: [
            buildMenuItem('undo', i18n.getMessageFor('Undo')),
            buildMenuItem('redo', i18n.getMessageFor('Redo')),
            { type: 'separator' },
            buildMenuItem('cut', i18n.getMessageFor('Cut')),
            buildMenuItem('copy', i18n.getMessageFor('Copy')),
            buildMenuItem('paste', i18n.getMessageFor('Paste')),
            buildMenuItem('pasteandmatchstyle', i18n.getMessageFor('Paste and Match Style')),
            buildMenuItem('delete', i18n.getMessageFor('Delete')),
            buildMenuItem('selectall', i18n.getMessageFor('Select All'))
        ]
    },
    {
        label: i18n.getMessageFor('View'),
        submenu: [{
            label: i18n.getMessageFor('Reload'),
            accelerator: 'CmdOrCtrl+R',
            click(item, focusedWindow) {
                if (focusedWindow) {
                    focusedWindow.reload();
                }
            }
        },
        { type: 'separator' },
        buildMenuItem('resetzoom', i18n.getMessageFor('Actual Size')),
        buildMenuItem('zoomin', i18n.getMessageFor('Zoom In')),
        buildMenuItem('zoomout', i18n.getMessageFor('Zoom Out')),
        { type: 'separator' },
        buildMenuItem('togglefullscreen', i18n.getMessageFor('Toggle Full Screen')),
        ]
    },
    {
        role: 'window',
        label: i18n.getMessageFor('Window'),
        submenu: [
            buildMenuItem('minimize', i18n.getMessageFor('Minimize')),
            buildMenuItem('close', i18n.getMessageFor('Close')),
        ]
    },
    {
        role: 'help',
        label: i18n.getMessageFor('Help'),
        submenu:
            [
                {
                    label: i18n.getMessageFor('Symphony Help'),
                    click() {
                        let helpUrl = i18n.getMessageFor('Help Url');
                        electron.shell.openExternal(helpUrl);
                    }
                },
                {
                    label: i18n.getMessageFor('Learn More'),
                    click() {
                        let symUrl = i18n.getMessageFor('Symphony Url');
                        electron.shell.openExternal(symUrl);
                    }
                },
                {
                    label: i18n.getMessageFor('Troubleshooting'),
                    submenu: [
                        {
                            label: isMac ? i18n.getMessageFor('Show Logs in Finder') : i18n.getMessageFor('Show Logs in Explorer'),
                            click(item, focusedWindow) {

                                const FILE_EXTENSIONS = ['.log'];
                                const MAC_LOGS_PATH = '/Library/Logs/Symphony/';
                                const WINDOWS_LOGS_PATH = '\\AppData\\Roaming\\Symphony\\logs';

                                let logsPath = isMac ? MAC_LOGS_PATH : WINDOWS_LOGS_PATH;
                                let source = electron.app.getPath('home') + logsPath;

                                if (!fs.existsSync(source) && focusedWindow && !focusedWindow.isDestroyed()) {
                                    electron.dialog.showMessageBox(focusedWindow, {
                                        type: 'error',
                                        title: i18n.getMessageFor('Failed!'),
                                        message: i18n.getMessageFor('No logs are available to share')
                                    });
                                    return;
                                }

                                let destPath = isMac ? '/logs_symphony_' : '\\logs_symphony_';
                                let timestamp = new Date().getTime();

                                let destination = electron.app.getPath('downloads') + destPath + timestamp + '.zip';

                                archiveHandler.generateArchiveForDirectory(source, destination, FILE_EXTENSIONS)
                                    .then(() => {
                                        electron.shell.showItemInFolder(destination);
                                    })
                                    .catch((err) => {
                                        if (focusedWindow && !focusedWindow.isDestroyed()) {
                                            electron.dialog.showMessageBox(focusedWindow, {
                                                type: 'error',
                                                title: i18n.getMessageFor('Failed!'),
                                                message: i18n.getMessageFor('Unable to generate logs due to ') + err
                                            });
                                        }
                                    });

                            }
                        },
                        {
                            label: isMac ? i18n.getMessageFor('Show crash dump in Finder') : i18n.getMessageFor('Show crash dump in Explorer'),
                            click(item, focusedWindow) {
                                const FILE_EXTENSIONS = isMac ? ['.dmp'] : ['.dmp', '.txt'];
                                const crashesDirectory = electron.crashReporter.getCrashesDirectory();
                                let source = isMac ? crashesDirectory + '/completed' : crashesDirectory;

                                // TODO: Add support to get diagnostic reports from ~/Library/Logs/DiagnosticReports
                                if (!fs.existsSync(source) || fs.readdirSync(source).length === 0 && focusedWindow && !focusedWindow.isDestroyed()) {
                                    electron.dialog.showMessageBox(focusedWindow, {
                                        type: 'error',
                                        title: i18n.getMessageFor('Failed!'),
                                        message: i18n.getMessageFor('No crashes available to share')
                                    });
                                    return;
                                }

                                let destPath = isMac ? '/crashes_symphony_' : '\\crashes_symphony_';
                                let timestamp = new Date().getTime();

                                let destination = electron.app.getPath('downloads') + destPath + timestamp + '.zip';

                                archiveHandler.generateArchiveForDirectory(source, destination, FILE_EXTENSIONS)
                                    .then(() => {
                                        electron.shell.showItemInFolder(destination);
                                    })
                                    .catch((err) => {
                                        if (focusedWindow && !focusedWindow.isDestroyed()) {
                                            electron.dialog.showMessageBox(focusedWindow, {
                                                type: 'error',
                                                title: i18n.getMessageFor('Failed!'),
                                                message: i18n.getMessageFor('Unable to generate crash reports due to ') + err
                                            });
                                        }
                                    });
                            }
                        },
                        {
                            label: i18n.getMessageFor('Toggle Developer Tools'),
                            accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                            click(item, focusedWindow) {
                                let devToolsEnabled = readConfigFromFile('devToolsEnabled');
                                if (focusedWindow && devToolsEnabled) {
                                    focusedWindow.webContents.toggleDevTools();
                                } else {
                                    log.send(logLevels.INFO, `dev tools disabled for ${focusedWindow.winName} window`);                                    
                                    electron.dialog.showMessageBox(focusedWindow, {
                                        type: 'warning',
                                        buttons: ['Ok'],
                                        title: i18n.getMessageFor('Dev Tools disabled'),
                                        message: i18n.getMessageFor('Dev Tools has been disabled! Please contact your system administrator to enable it!'),
                                    });
                                }
                            }
                        },
                        {
                            label: i18n.getMessageFor('More Information'),
                            click(item, focusedWindow) {
                                let windowName = focusedWindow ? focusedWindow.name : '';
                                moreInfo.openMoreInfoWindow(windowName);
                            }
                        }
                    ]
                }
            ]
    }
    ];

    if (isMac && template[0].label !== app.getName()) {
        template.unshift({
            label: app.getName(),
            submenu: [{
                role: 'about',
                label: i18n.getMessageFor('About Symphony')
            },
            {
                type: 'separator'
            },
            {
                role: 'services',
                label: i18n.getMessageFor('Services'),
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                role: 'hide',
                label: i18n.getMessageFor('Hide Symphony')
            },
            {
                role: 'hideothers',
                label: i18n.getMessageFor('Hide Others')
            },
            {
                role: 'unhide',
                label: i18n.getMessageFor('Show All')
            },
            {
                type: 'separator'
            },
            {
                role: 'quit',
                label: i18n.getMessageFor('Quit Symphony')
            }
            ]
        });
        // Edit menu.
        template[1].submenu.push({
            type: 'separator'
        }, {
            label: i18n.getMessageFor('Speech'),
            submenu: [{
                role: 'startspeaking',
                label: i18n.getMessageFor('Start Speaking')
            },
            {
                role: 'stopspeaking',
                label: i18n.getMessageFor('Stop Speaking')
            }
            ]
        });
        // Window menu.
        template[3].submenu = [{
            accelerator: 'CmdOrCtrl+W',
            role: 'close',
            label: i18n.getMessageFor('Close')
        },
        {
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize',
            label: i18n.getMessageFor('Minimize')
        },
        {
            role: 'zoom',
            label: i18n.getMessageFor('Zoom')
        },
        {
            type: 'separator'
        },
        {
            role: 'front',
            label: i18n.getMessageFor('Bring All to Front')
        }
        ];
    }

    let index = 2;
    if (isMac && template[0].label !== app.getName()) {
        index = 3;
    }

    template[index].submenu.push({
        type: 'separator'
    });

    // Window menu -> launchOnStartup.
    template[index].submenu.push({
        label: i18n.getMessageFor('Auto Launch On Startup'),
        type: 'checkbox',
        checked: launchOnStartup,
        click: function (item, focusedWindow) {
            if (item.checked) {
                autoLaunch.enable()
                    .catch(function (err) {
                        let title = 'Error setting AutoLaunch configuration';
                        log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                        if (focusedWindow && !focusedWindow.isDestroyed()) {
                            electron.dialog.showMessageBox(focusedWindow, {
                                type: 'error',
                                title: i18n.getMessageFor(title),
                                message: i18n.getMessageFor(title) + ': ' + err
                            });
                        }
                    });
            } else {
                autoLaunch.disable()
                    .catch(function (err) {
                        let title = 'Error setting AutoLaunch configuration';
                        log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                        if (focusedWindow && !focusedWindow.isDestroyed()) {
                            electron.dialog.showMessageBox(focusedWindow, {
                                type: 'error',
                                title: i18n.getMessageFor(title),
                                message: i18n.getMessageFor(title) + ': ' + err
                            });
                        }
                    });
            }
            launchOnStartup = item.checked;
            updateConfigField('launchOnStartup', launchOnStartup);
        }
    });

    // Window menu -> alwaysOnTop.
    template[index].submenu.push({
        label: i18n.getMessageFor('Always on Top'),
        type: 'checkbox',
        checked: isAlwaysOnTop,
        click: (item) => {
            isAlwaysOnTop = item.checked;
            eventEmitter.emit('isAlwaysOnTop', {
                isAlwaysOnTop,
                shouldActivateMainWindow: true
            });
            updateConfigField('alwaysOnTop', isAlwaysOnTop);
        }
    });

    // Window menu -> minimizeOnClose.
    // ToDo: Add behavior on Close.
    template[index].submenu.push({
        label: i18n.getMessageFor('Minimize on Close'),
        type: 'checkbox',
        checked: minimizeOnClose,
        click: function (item) {
            minimizeOnClose = item.checked;
            updateConfigField('minimizeOnClose', minimizeOnClose);
        }
    });

    // Window menu -> bringToFront
    template[index].submenu.push({
        label: isWindowsOS ? i18n.getMessageFor('Flash Notification in Taskbar') : i18n.getMessageFor('Bring to Front on Notifications'),
        type: 'checkbox',
        checked: bringToFront,
        click: function (item) {
            bringToFront = item.checked;
            updateConfigField('bringToFront', bringToFront);
        }
    });

    // Window/View menu -> separator
    template[index].submenu.push({
        type: 'separator',
    });

    // Window - View menu -> memoryRefresh
    template[index].submenu.push({
        label: i18n.getMessageFor('Refresh app when idle'),
        type: 'checkbox',
        checked: memoryRefresh,
        click: function (item) {
            memoryRefresh = item.checked;
            updateConfigField('memoryRefresh', memoryRefresh);
        }
    });

    // Window - View menu -> Clear Cache
    template[index].submenu.push({
        label: i18n.getMessageFor('Clear cache and Reload'),
        click: function (item, focusedWindow) {
            if (focusedWindow && !focusedWindow.isDestroyed()) {
                electron.session.defaultSession.clearCache(() => {
                    focusedWindow.reload();
                });
            }
        }
    });

    if (!isMac) {
        /* eslint-disable no-param-reassign */
        template[index].submenu.push({
            label: titleBarStyle === titleBarStyles.NATIVE ?
                i18n.getMessageFor('Enable Hamburger menu') :
                i18n.getMessageFor('Disable Hamburger menu'),
            click: function () {
                const isNativeStyle = titleBarStyle === titleBarStyles.NATIVE;

                titleBarStyle = isNativeStyle ? titleBarStyles.NATIVE : titleBarStyles.CUSTOM;
                titleBarActions(app, isNativeStyle);
            }
        }, {
            type: 'separator'
        });
        /* eslint-enable no-param-reassign */

        template[index].submenu.push({
            label: i18n.getMessageFor('Quit Symphony'),
            click: function () {
                app.quit();
            }
        });

        // This adds About Symphony under help menu for windows
        template[3].submenu.push({
            label: i18n.getMessageFor('About Symphony'),
            click(menuItem, focusedWindow) {
                let windowName = focusedWindow ? focusedWindow.winName : '';
                aboutApp.openAboutWindow(windowName);
            }
        });
    }

    return template;
}

/**
 * Sets the checkbox values for different menu items
 * based on configuration
 */
function setCheckboxValues() {
    return new Promise((resolve) => {
        /**
		 * Method that reads multiple config fields
		 */
        getMultipleConfigField(configFields)
            .then(function (configData) {
                for (let key in configData) {
                    if (configData.hasOwnProperty(key)) { // eslint-disable-line no-prototype-builtins
                        switch (key) {
                            case 'minimizeOnClose':
                                minimizeOnClose = configData[key];
                                break;
                            case 'launchOnStartup':
                                launchOnStartup = configData[key];
                                break;
                            case 'alwaysOnTop':
                                isAlwaysOnTop = configData[key];
                                eventEmitter.emit('isAlwaysOnTop', {
                                    isAlwaysOnTop: configData[key],
                                    shouldActivateMainWindow: true
                                });
                                break;
                            case 'notificationSettings':
                                eventEmitter.emit('notificationSettings', configData[key]);
                                break;
                            case 'bringToFront':
                                bringToFront = configData[key];
                                break;
                            case 'isCustomTitleBar':
                                titleBarStyle = configData[key] ? titleBarStyles.CUSTOM : titleBarStyles.NATIVE;
                                break;
                            case 'memoryRefresh':
                                memoryRefresh = configData[key];
                                break;
                            default:
                                break;
                        }
                    }
                }
                return resolve();
            })
            .catch((err) => {
                let title = 'Error loading configuration';
                log.send(logLevels.ERROR, 'MenuTemplate: error reading configuration fields, error: ' + err);
                if (electron.BrowserWindow.getFocusedWindow() && !electron.BrowserWindow.getFocusedWindow().isDestroyed()) {
                    electron.dialog.showMessageBox(electron.BrowserWindow.getFocusedWindow(), {
                        type: 'error',
                        title: i18n.getMessageFor(title),
                        message: i18n.getMessageFor(title) + ': ' + err
                    });
                }
                return resolve();
            });
    });
}

/**
 * Sets respective accelerators w.r.t roles for the menu template
 *
 * @param role {String} The action of the menu item
 * @param label {String} Menu item name
 * @return {Object}
 * @return {Object}.role The action of the menu item
 * @return {Object}.accelerator keyboard shortcuts and modifiers
 */
function buildMenuItem(role, label) {

    if (isMac) {
        return label ? { role: role, label: label } : { role: role }
    }

    if (isWindowsOS) {
        return label ? { role: role, label: label, accelerator: windowsAccelerator[role] || '', registerAccelerator: true }
            : { role: role, accelerator: windowsAccelerator[role] || '', registerAccelerator: true }
    }

    return label ? { role: role, label: label } : { role: role }
}

function getMinimizeOnClose() {
    return minimizeOnClose;
}

function getTitleBarStyle() {
    return titleBarStyle;
}

/**
 * Displays an option to the user whether
 * to relaunch application
 *
 * @param app
 * @param isNativeStyle
 */
function titleBarActions(app, isNativeStyle) {
    const options = {
        type: 'question',
        title: i18n.getMessageFor('Relaunch Application'),
        message: i18n.getMessageFor('Updating Title bar style requires Symphony to relaunch.'),
        detail: i18n.getMessageFor('Note: When Hamburger menu is disabled, you can trigger the main menu by pressing the Alt key.'),
        buttons: [i18n.getMessageFor('Relaunch'), i18n.getMessageFor('Cancel')],
        cancelId: 1
    };
    electron.dialog.showMessageBox(electron.BrowserWindow.getFocusedWindow(), options, function (index) {
        if (index === 0) {
            updateConfigField('isCustomTitleBar', !!isNativeStyle)
                .then(() => {
                    app.relaunch();
                    app.exit();
                }).catch((e) => {
                    log.send(logLevels.ERROR, `Unable to disable / enable hamburger menu due to error: ${e}`);
                });
        }
    });
}

module.exports = {
    getTemplate: getTemplate,
    getMinimizeOnClose: getMinimizeOnClose,
    setCheckboxValues: setCheckboxValues,
    getTitleBarStyle: getTitleBarStyle
};
