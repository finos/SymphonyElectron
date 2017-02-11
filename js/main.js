const electron = require('electron');
const packageJSON = require('../package.json');
const menuTemplate = require('./menuTemplate.js');
const path = require('path');

const app = electron.app
const BrowserWindow = electron.BrowserWindow;

let willQuitApp = false;

if (require('electron-squirrel-startup')) return;

if (isDevEnv()) {
    // needed for development env because local server doesn't have cert
    app.commandLine.appendSwitch('--ignore-certificate-errors');
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let childWindows = [];

function isDevEnv() {
    var isDev = process.env.ELECTRON_DEV ?
        process.env.ELECTRON_DEV.trim().toLowerCase() === "true" : false;
    return isDev;
}

function createMainWindow () {
  // note: for now, turning off node integration as this is causing failure with
  // onelogin, jquery can not get initialized. electron's node integration
  // conflicts on the window object.
  mainWindow = new BrowserWindow({
      title: 'Symphony',
      width: 1024, height: 768,
      webPreferences: {
          sandbox: false,
          nodeIntegration: false,
          preload: path.join(__dirname, '/main-preload.js')
      }
  });

  mainWindow.loadURL(packageJSON.homepage);
  
  const menu = electron.Menu.buildFromTemplate(menuTemplate(app));
  electron.Menu.setApplicationMenu(menu);

  mainWindow.on('close', function(e) {
    if (willQuitApp) {
        mainWindow = null;
        return;
    }
    // mac should hide window when hitting x close
    if (process.platform === 'darwin') {
      mainWindow.hide();
      e.preventDefault();
    }
  });
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // open external links in default browser - window.open
  mainWindow.webContents.on('new-window', function(event, url) {
     event.preventDefault();
     electron.shell.openExternal(url);
  });
}

electron.ipcMain.on('symphony-msg', (event, arg) => {
    if (arg && arg.cmd === 'open' && arg.url) {
        var width = arg.width || 1024;
        var height = arg.height || 768;
        var title = arg.title || 'Symphony';

        let childWindow = new BrowserWindow({
            title: title,
            width: width,
            height: height,
            webPreferences: {
                sandbox: false,
                nodeIntegration: false,
                preload: path.join(__dirname, '/child-preload.js')
            }
        });

        childWindows.push(childWindow);
        childWindow.loadURL(arg.url);
        return;
    }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    createMainWindow();
});

app.on('before-quit', function() {
    willQuitApp = true;
});

app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
      createMainWindow();
  } else {
      mainWindow.show();
  }
});
