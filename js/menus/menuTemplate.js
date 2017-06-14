'use strict';

const electron = require('electron');
const { getConfigField, updateConfigField } = require('../config.js');
const AutoLaunch = require('auto-launch');
const isMac = require('../utils/misc.js').isMac;
const childProcess = require('child_process');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const eventEmitter = require('../eventEmitter');

var minimizeOnClose = false;
var launchOnStartup = false;

setCheckboxValues();

var symphonyAutoLauncher = new AutoLaunch({
    name: 'Symphony',
    path: process.execPath,
});
let launchAgentPath = '~/Library/LaunchAgents/com.symphony.symphony-desktop.agent.plist';

const template = [
    {
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
        submenu: [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click (item, focusedWindow) {
                    if (focusedWindow) {
                        focusedWindow.reload();
                    }
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click (item, focusedWindow) {
                    if (focusedWindow) {
                        focusedWindow.webContents.toggleDevTools();
                    }
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
        submenu: [
            {
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
                click () { electron.shell.openExternal('https://www.symphony.com') }
            }
        ]
    }
];

function getTemplate(app) {
    if (isMac && template[0].label !== app.getName()) {
        template.unshift({
            label: app.getName(),
            submenu: [
                {
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
        template[1].submenu.push(
            {
                type: 'separator'
            },
            {
                label: 'Speech',
                submenu: [
                    {
                        role: 'startspeaking'
                    },
                    {
                        role: 'stopspeaking'
                    }
                ]
            }
      )
      // Window menu.
        template[3].submenu = [
            {
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
        ]
    }

    var index = 2;
    if (isMac && template[0].label !== app.getName()){
        index = 3;
    }

    // Window menu -> launchOnStartup.
    template[index].submenu.push(
        {
            label: 'Auto Launch On Startup', 
            type: 'checkbox', 
            checked: launchOnStartup,
            click: function (item) {
                if (item.checked){
                    if (isMac){
                        // TODO: Need to change this implementation to AutoLaunch once they fix this issue ->
                        // https://github.com/Teamwork/node-auto-launch/issues/28
                        childProcess.exec(`launchctl load ${launchAgentPath}`, (err) => {
                            if (err){
                                let title = 'Error setting AutoLaunch configuration';
                                log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': process error ' + err);
                                electron.dialog.showErrorBox(title, 'Please try reinstalling the application');
                            }
                        });
                    } else {
                        symphonyAutoLauncher.enable()
                            .catch(function (err) {
                                let title = 'Error setting AutoLaunch configuration';
                                log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                                electron.dialog.showErrorBox(title, title + ': ' + err);
                            });
                    }
                } else {
                    if (isMac){
                        // TODO: Need to change this implementation to AutoLaunch once they fix this issue ->
                        // https://github.com/Teamwork/node-auto-launch/issues/28
                        childProcess.exec(`launchctl unload ${launchAgentPath}`, (err) => {
                            if (err){
                                let title = 'Error disabling AutoLaunch configuration';
                                log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': process error ' + err);
                                electron.dialog.showErrorBox(title, 'Please try reinstalling the application');
                            }
                        });
                    } else {
                        symphonyAutoLauncher.disable()
                            .catch(function (err) {
                                let title = 'Error setting AutoLaunch configuration';
                                log.send(logLevels.ERROR, 'MenuTemplate: ' + title + ': auto launch error ' + err);
                                electron.dialog.showErrorBox(title, title + ': ' + err);
                            });
                    }
                }
                launchOnStartup = item.checked;
                updateConfigField('launchOnStartup', launchOnStartup);
            }
        }
    )

    // Window menu -> minimizeOnClose.
    // ToDo: Add behavior on Close.
    template[index].submenu.push(
        {
            label: 'Minimize on Close', 
            type: 'checkbox', 
            checked: minimizeOnClose,
            click: function (item) {
                minimizeOnClose = item.checked;
                updateConfigField('minimizeOnClose', minimizeOnClose);
            }
        }
    )

    if (!isMac){
        template[index].submenu.push(
            {
                label: 'Quit Symphony', 
                click: function () {
                    app.quit();
                }
            }
        )
    }

    return template;
}

function setCheckboxValues(){
    getConfigField('minimizeOnClose').then(function(mClose) {
        minimizeOnClose = mClose;
    }).catch(function (err){
        let title = 'Error loading configuration';
        log.send(logLevels.ERROR, 'MenuTemplate: error getting config field minimizeOnClose, error: ' + err);
        electron.dialog.showErrorBox(title, title + ': ' + err);
    });
    
    getConfigField('launchOnStartup').then(function(lStartup) {
        launchOnStartup = lStartup;
    }).catch(function (err){
        let title = 'Error loading configuration';
        log.send(logLevels.ERROR, 'MenuTemplate: error getting config field launchOnStartup, error: ' + err);
        electron.dialog.showErrorBox(title, title + ': ' + err);
    });

    getConfigField('notfPosition').then(function(position) {
        eventEmitter.emit('notfPosition', position);
    }).catch(function (err){
        let title = 'Error loading configuration';
        log.send(logLevels.ERROR, 'MenuTemplate: error getting config field notfPosition, error: ' + err);
        electron.dialog.showErrorBox(title, title + ': ' + err);
    });

    getConfigField('notfScreen').then(function(screen) {
        eventEmitter.emit('notfScreen', screen);
    }).catch(function (err){
        let title = 'Error loading configuration';
        log.send(logLevels.ERROR, 'MenuTemplate: error getting config field notfScreen, error: ' + err);
        electron.dialog.showErrorBox(title, title + ': ' + err);
    });
}

function getMinimizeOnClose(){
    return minimizeOnClose;
}

module.exports = {
    getTemplate : getTemplate,
    getMinimizeOnClose : getMinimizeOnClose
};