'use strict';

const electron = require('electron');
const { updateConfigField, getMultipleConfigField } = require('../config.js');
const AutoLaunch = require('auto-launch');
const isMac = require('../utils/misc.js').isMac;
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const eventEmitter = require('../eventEmitter');
const aboutApp = require('../aboutApp');

const configFields = [
    'minimizeOnClose',
    'launchOnStartup',
    'alwaysOnTop',
    'notificationSettings',
    'bringToFront'
];

let minimizeOnClose = false;
let launchOnStartup = false;
let isAlwaysOnTop = false;
let bringToFront = false;

let symphonyAutoLauncher;

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
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteandmatchstyle' },
            { role: 'delete' },
            { role: 'selectall' }
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
    {
        label: 'Toggle Developer Tools',
        accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click(item, focusedWindow) {
            if (focusedWindow) {
                focusedWindow.webContents.toggleDevTools();
            }
        }
    },
    {
        label: 'Set Downloads Directory',
        click() {
            electron.dialog.showOpenDialog({
                title: 'Select Downloads Directory',
                buttonLabel: 'Select',
                properties: ['openDirectory', 'createDirectory']
            }, (filePaths) => {
                if (!filePaths || !Array.isArray(filePaths) || filePaths.length < 1) {
                    return;
                }
                updateConfigField('downloadsDirectory', filePaths[0]);
                eventEmitter.emit('setDownloadsDirectory', filePaths[0]);
            });
        }
    },
    {
        label: 'Open Crashes Directory',
        click() {
            const crashesDirectory = electron.crashReporter.getCrashesDirectory() + '/completed';
            electron.shell.showItemInFolder(crashesDirectory);
        }
    },
    {
        type: 'separator'
    },
    {
        role: 'resetzoom'
    },
    {
        role: 'zoomin'
    },
    {
        role: 'zoomout'
    },
    {
        type: 'separator'
    },
    {
        role: 'togglefullscreen'
    }
    ]
},
{
    role: 'window',
    submenu: [{
        role: 'minimize'
    },
    {
        role: 'close'
    }
    ]
},
{
    role: 'help',
    submenu: [
        {
            label: 'Learn More',
            click() { electron.shell.openExternal('https://www.symphony.com'); }
        }]
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
        click: function(item) {
            if (item.checked) {
                symphonyAutoLauncher.enable()
                    .catch(function(err) {
                        let title = 'Error setting AutoLaunch configuration';
                        log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                        electron.dialog.showErrorBox(title, title + ': ' + err);
                    });
            } else {
                symphonyAutoLauncher.disable()
                    .catch(function(err) {
                        let title = 'Error setting AutoLaunch configuration';
                        log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                        electron.dialog.showErrorBox(title, title + ': ' + err);
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
            eventEmitter.emit('isAlwaysOnTop', isAlwaysOnTop);
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
        label: 'Bring to Front on Notifications',
        type: 'checkbox',
        checked: bringToFront,
        click: function(item) {
            bringToFront = item.checked;
            updateConfigField('bringToFront', bringToFront);
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
                                eventEmitter.emit('isAlwaysOnTop', configData[key]);
                                break;
                            case 'notificationSettings':
                                eventEmitter.emit('notificationSettings', configData[key]);
                                break;
                            case 'bringToFront':
                                bringToFront = configData[key];
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
                electron.dialog.showErrorBox(title, title + ': ' + err);
                return resolve();
            });
    });
}

function getMinimizeOnClose() {
    return minimizeOnClose;
}

module.exports = {
    getTemplate: getTemplate,
    getMinimizeOnClose: getMinimizeOnClose,
    setCheckboxValues: setCheckboxValues
};