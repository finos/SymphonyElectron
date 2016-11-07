const electron = require('electron');
const packageJSON = require('./package.json');
const menuTemplate = require('./menuTemplate.js');

const app = electron.app
const BrowserWindow = electron.BrowserWindow

if (require('electron-squirrel-startup')) return;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  // note: for now, turning off node integration as this is causing failure with
  // onelogin, jquery can not get initialized. electron's node integration
  // conflicts on the window object.
  mainWindow = new BrowserWindow({
      title: 'Symphony',
      width: 1024, height: 768,
      webPreferences: {
          sandbox: false,
          nodeIntegration: false
      }
  });

  const menu = electron.Menu.buildFromTemplate(menuTemplate(app));
  electron.Menu.setApplicationMenu(menu)

  mainWindow.loadURL(packageJSON.homepage);

  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});
