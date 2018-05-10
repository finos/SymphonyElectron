'use strict';

const electron = require('electron');
const fs = require('fs');
const { updateConfigField, getMultipleConfigField } = require('../config.js');
const AutoLaunch = require('auto-launch');
const { isMac, isWindowsOS } = require('../utils/misc.js');
const archiveHandler = require('../utils/archiveHandler');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const eventEmitter = require('../eventEmitter');
const aboutApp = require('../aboutApp');

const configFields = [
    'minimizeOnClose',
    'launchOnStartup',
    'alwaysOnTop',
    'notificationSettings',
    'bringToFront',
    'memoryRefresh'
];

let minimizeOnClose = false;
let launchOnStartup = false;
let isAlwaysOnTop = false;
let bringToFront = false;
let memoryRefresh = false;

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
    label: 'Edit',
    submenu: [
        buildMenuItem('undo'),
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
    label: 'View',
    submenu: [{
        label: 'Reload',
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
            label: 'Symphony Help',
            click() { electron.shell.openExternal('https://support.symphony.com'); }
        },
        {
            label: 'Learn More',
            click() { electron.shell.openExternal('https://www.symphony.com'); }
        },
        {
            label: 'Troubleshooting',
            submenu: [
                {
                    label: isMac ? 'Show Logs in Finder' : 'Show Logs in Explorer',
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
                    label: isMac ? 'Show crash dump in Finder' : 'Show crash dump in Explorer',
                    click(item, focusedWindow) {
                        const FILE_EXTENSIONS = isMac ? [ '.dmp' ] : [ '.dmp', '.txt' ];
                        const crashesDirectory = electron.crashReporter.getCrashesDirectory();
                        let source = isMac ? crashesDirectory + '/completed' : crashesDirectory;

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
            label: 'Speech',
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
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        },
        {
            label: 'Minimize',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        },
        {
            label: 'Zoom',
            role: 'zoom'
        },
        {
            type: 'separator'
        },
        {
            label: 'Bring All to Front',
            role: 'front'
        }
        ];
    }

    let index = 2;
    if (isMac && template[0].label !== app.getName()) {
        index = 3;
    }

    // Window menu -> launchOnStartup.
    template[index].submenu.push({
        label: 'Auto Launch On Startup',
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
        label: 'Always on top',
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
        label: 'Minimize on Close',
        type: 'checkbox',
        checked: minimizeOnClose,
        click: function(item) {
            minimizeOnClose = item.checked;
            updateConfigField('minimizeOnClose', minimizeOnClose);
        }
    });

    // Window menu -> bringToFront
    template[index].submenu.push({
        label: isWindowsOS ? 'Flash Notification in Taskbar' : 'Bring to Front on Notifications',
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
        template[index].submenu.push({
            label: 'Quit Symphony',
            click: function() {
                app.quit();
            }
        });

        // This adds About Symphony under help menu for windows
        template[3].submenu.push({
            label: 'About Symphony',
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
function buildMenuItem(role) {

    if (isMac) {
        return { role: role }
    }

    if (isWindowsOS) {
        return { role: role, accelerator: windowsAccelerator[role] || '' }
    }

    return { role: role }
}

function getMinimizeOnClose() {
    return minimizeOnClose;
}

module.exports = {
    getTemplate: getTemplate,
    getMinimizeOnClose: getMinimizeOnClose,
    setCheckboxValues: setCheckboxValues
};