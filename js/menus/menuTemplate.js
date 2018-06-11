'use strict';

const electron = require('electron');
const fs = require('fs');
const { updateConfigField, getMultipleConfigField } = require('../config.js');
const AutoLaunch = require('auto-launch');
const { isMac, isWindowsOS, isWindows10 } = require('../utils/misc.js');
const archiveHandler = require('../utils/archiveHandler');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const eventEmitter = require('../eventEmitter');
const aboutApp = require('../aboutApp');
const titleBarStyles = require('../enums/titleBarStyles');
const i18n = new(require('../translation/i18n'))('ja-JP');

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

let symphonyAutoLauncher;

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

if (isMac) {
    symphonyAutoLauncher = new AutoLaunch({
        name: 'Symphony',
        mac: {
            useLaunchAgent: true,
        },
        path: process.execPath,
    });
} else {
    symphonyAutoLauncher = new AutoLaunch({
        name: 'Symphony',
        path: process.execPath,
    });
}

const template = [{
    label: i18n.__('Edit'),
    submenu: [
        buildMenuItem('undo', i18n.__('Undo')),
        buildMenuItem('redo'),
        { type: 'separator' },
        buildMenuItem('cut'),
        buildMenuItem('copy'),
        buildMenuItem('paste'),
        buildMenuItem('pasteandmatchstyle'),
        buildMenuItem('delete'),
        buildMenuItem('selectall')
    ]
},
{
    label: i18n.__('View'),
    submenu: [{
        label: i18n.__('Reload'),
        accelerator: 'CmdOrCtrl+R',
        click(item, focusedWindow) {
            if (focusedWindow) {
                focusedWindow.reload();
            }
        }
    },
        { type: 'separator' },
        buildMenuItem('resetzoom'),
        buildMenuItem('zoomin'),
        buildMenuItem('zoomout'), 
        { type: 'separator' },
        buildMenuItem('togglefullscreen'),
    ]
},
{
    role: 'window',
    submenu: [
        buildMenuItem('minimize'),
        buildMenuItem('close'),
    ]
},
{
    role: 'help',
    submenu: 
    [
        {
            label: i18n.__('Symphony Help'),
            click() { electron.shell.openExternal('https://support.symphony.com'); }
        },
        {
            label: i18n.__('Learn More'),
            click() { electron.shell.openExternal('https://www.symphony.com'); }
        },
        {
            label: i18n.__('Troubleshooting'),
            submenu: [
                {
                    label: isMac ? i18n.__('Show Logs in Finder') : i18n.__('Show Logs in Explorer'),
                    click(item, focusedWindow) {

                        const FILE_EXTENSIONS = [ '.log' ];
                        const MAC_LOGS_PATH = '/Library/Logs/Symphony/';
                        const WINDOWS_LOGS_PATH = '\\AppData\\Roaming\\Symphony\\logs';
            
                        let logsPath = isMac ? MAC_LOGS_PATH : WINDOWS_LOGS_PATH;
                        let source = electron.app.getPath('home') + logsPath;
            
                        if (!fs.existsSync(source) && focusedWindow && !focusedWindow.isDestroyed()) {
                            electron.dialog.showMessageBox(focusedWindow, {type: 'error', title: 'Failed!', message: 'No logs are available to share'});
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
                                    electron.dialog.showMessageBox(focusedWindow, {type: 'error', title: 'Failed!', message: `Unable to generate logs due to -> ${err}`});
                                }
                            })
            
                    }
                },
                {
                    label: isMac ? i18n.__('Show crash dump in Finder') : i18n.__('Show crash dump in Explorer'),
                    click(item, focusedWindow) {
                        const FILE_EXTENSIONS = isMac ? [ '.dmp' ] : [ '.dmp', '.txt' ];
                        const crashesDirectory = electron.crashReporter.getCrashesDirectory();
                        let source = isMac ? crashesDirectory + '/completed' : crashesDirectory;

                        // TODO: Add support to get diagnostic reports from ~/Library/Logs/DiagnosticReports
                        if (!fs.existsSync(source) || fs.readdirSync(source).length === 0 && focusedWindow && !focusedWindow.isDestroyed()) {
                            electron.dialog.showMessageBox(focusedWindow, {type: 'error', title: 'Failed!', message: 'No crashes available to share'});
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
                                    electron.dialog.showMessageBox(focusedWindow, {type: 'error', title: 'Failed!', message: `Unable to generate crash reports due to -> ${err}`});
                                }
                            });
                    }
                }
            ]
        }
    ]
}
];

function getTemplate(app) {
    if (isMac && template[0].label !== app.getName()) {
        template.unshift({
            label: app.getName(),
            submenu: [{
                role: 'about'
            },
            {
                type: 'separator'
            },
            {
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                role: 'hide'
            },
            {
                role: 'hideothers'
            },
            {
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                role: 'quit'
            }
            ]
        });
        // Edit menu.
        template[1].submenu.push({
            type: 'separator'
        }, {
            label: i18n.__('Speech'),
            submenu: [{
                role: 'startspeaking'
            },
            {
                role: 'stopspeaking'
            }
            ]
        });
        // Window menu.
        template[3].submenu = [{
            label: i18n.__('Close'),
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        },
        {
            label: i18n.__('Minimize'),
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        },
        {
            label: i18n.__('Zoom'),
            role: 'zoom'
        },
        {
            type: 'separator'
        },
        {
            label: i18n.__('Bring All to Front'),
            role: 'front'
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
        label: i18n.__('Auto Launch On Startup'),
        type: 'checkbox',
        checked: launchOnStartup,
        click: function(item, focusedWindow) {
            if (item.checked) {
                symphonyAutoLauncher.enable()
                    .catch(function(err) {
                        let title = 'Error setting AutoLaunch configuration';
                        log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                        if (focusedWindow && !focusedWindow.isDestroyed()) {
                            electron.dialog.showMessageBox(focusedWindow, {type: 'error', title, message: title + ': ' + err});
                        }
                    });
            } else {
                symphonyAutoLauncher.disable()
                    .catch(function(err) {
                        let title = 'Error setting AutoLaunch configuration';
                        log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                        if (focusedWindow && !focusedWindow.isDestroyed()) {
                            electron.dialog.showMessageBox(focusedWindow, {type: 'error', title, message: title + ': ' + err});
                        }
                    });
            }
            launchOnStartup = item.checked;
            updateConfigField('launchOnStartup', launchOnStartup);
        }
    });

    // Window menu -> alwaysOnTop.
    template[index].submenu.push({
        label: i18n.__('Always on Top'),
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
        label: i18n.__('Minimize on Close'),
        type: 'checkbox',
        checked: minimizeOnClose,
        click: function(item) {
            minimizeOnClose = item.checked;
            updateConfigField('minimizeOnClose', minimizeOnClose);
        }
    });

    // Window menu -> bringToFront
    template[index].submenu.push({
        label: isWindowsOS ? i18n.__('Flash Notification in Taskbar') : i18n.__('Bring to Front on Notifications'),
        type: 'checkbox',
        checked: bringToFront,
        click: function(item) {
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
        label: 'Refresh app when idle',
        type: 'checkbox',
        checked: memoryRefresh,
        click: function(item) {
            memoryRefresh = item.checked;
            updateConfigField('memoryRefresh', memoryRefresh);
        }
    });

    if (!isMac) {

        if (isWindows10()) {
            /* eslint-disable no-param-reassign */
            template[index].submenu.push({
                label: i18n.__('Title Bar Style'),
                submenu: [
                    {
                        label: i18n.__('Native With Custom'),
                        type: 'checkbox',
                        checked: titleBarStyle === titleBarStyles.NATIVE_WITH_CUSTOM,
                        click: function (item) {
                            item.menu.items[1].checked = false;
                            titleBarStyle = titleBarStyles.NATIVE_WITH_CUSTOM;
                            updateConfigField('isCustomTitleBar', false);
                        }
                    },
                    {
                        label: i18n.__('Custom'),
                        type: 'checkbox',
                        checked: titleBarStyle === titleBarStyles.CUSTOM,
                        click: function (item) {
                            item.menu.items[0].checked = false;
                            titleBarStyle = titleBarStyles.CUSTOM;
                            updateConfigField('isCustomTitleBar', true);
                        }
                    }
                ]
            }, {
                type: 'separator'
            });
            /* eslint-enable no-param-reassign */
        }

        template[index].submenu.push({
            label: i18n.__('Quit Symphony'),
            click: function() {
                app.quit();
            }
        });

        // This adds About Symphony under help menu for windows
        template[3].submenu.push({
            label: i18n.__('About Symphony'),
            click(focusedWindow) {
                let windowName = focusedWindow ? focusedWindow.name : '';
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
                                titleBarStyle = configData[key] ? titleBarStyles.CUSTOM : titleBarStyles.NATIVE_WITH_CUSTOM;
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
                    electron.dialog.showMessageBox(electron.BrowserWindow.getFocusedWindow(), {type: 'error', title, message: title + ': ' + err});
                }
                return resolve();
            });
    });
}

/**
 * Sets respective accelerators w.r.t roles for the menu template
 *
 * @param role {String}              The action of the menu item
 *
 * @return {Object}
 * @return {Object}.role         The action of the menu item
 * @return {Object}.accelerator  keyboard shortcuts and modifiers
 */
function buildMenuItem(role, label) {

    if (isMac) {
        return { role: role, label: label }
    }

    if (isWindowsOS) {
        return { role: role, label: label, accelerator: windowsAccelerator[role] || '' }
    }

    return { role: role, label: label }
}

function getMinimizeOnClose() {
    return minimizeOnClose;
}

function getTitleBarStyle() {
    return titleBarStyle;
}

module.exports = {
    getTemplate: getTemplate,
    getMinimizeOnClose: getMinimizeOnClose,
    setCheckboxValues: setCheckboxValues,
    getTitleBarStyle: getTitleBarStyle
};