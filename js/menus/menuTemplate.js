'use strict';

const electron = require('electron');
const getConfig = require('../getConfig.js');
const ws = require('windows-shortcuts');
const fs = require('fs');
const path = require('path');
const appl = electron.app;
var minimizeOnClose = false;
var launchOnStartup = false;

getConfig()
.then(setCheckboxValues).catch(function (err){
    let title = 'Error setting checkboxes.';
    electron.dialog.showErrorBox(title, title + ': ' + err);
});

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
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
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
    
    if (process.platform === 'darwin' && template[0].label !== app.getName()) {
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
    } else
    {
      // Window menu when Windows.
        template[2].submenu.push(
            {
                label: 'Auto Launch on Windows Startup', 
                type: 'checkbox', 
                checked: launchOnStartup,
                click: function (item) {
                    if (item.checked){
                        const execFile = 'Symphony.exe';
                        let execPath = path.join(app.getAppPath(), execFile);
                        ws.create("%APPDATA%/Microsoft/Windows/Start Menu/Programs/Startup/Symphony.lnk", execPath);
                    } else {
                        fs.unlink(path.join(process.env.APPDATA,"Microsoft/Windows/Start Menu/Programs/Startup/Symphony.lnk"), () => {});
                    }
                    launchOnStartup = item.checked;
                    getConfig().then(saveConfigFile);
                }
            }
        )
    }

    // Window menu -> minimizeOnClose.
    // ToDo: Add behavior on Close.
    var index = 2;
    if (process.platform === 'darwin' && template[0].label !== app.getName()){
        index = 3;
    }
    template[index].submenu.push(
        {
            label: 'Minimize on Close', 
            type: 'checkbox', 
            checked: minimizeOnClose,
            click: function (item) {
                minimizeOnClose = item.checked;
                getConfig().then(saveConfigFile);
            }
        }
    )

    return template;
}

function setCheckboxValues(config){
    minimizeOnClose = config.minimizeOnClose === "true" ? true : false;
    launchOnStartup = config.launchOnStartup === "true" ? true : false;
}

function saveConfigFile(config){
    let configPath;
    const configFile = 'config/Symphony.config';
    configPath = path.join(appl.getAppPath(), configFile);
    let conf = config;
    conf.minimizeOnClose = minimizeOnClose;
    conf.launchOnStartup = launchOnStartup;
    fs.writeFile(configPath, JSON.stringify(config, null, 4),(err) => {
        if (err){
            let title = 'Error saving config file.';
            electron.dialog.showErrorBox(title, title + ': ' + err);
        }
    });
}

module.exports = getTemplate;
