'use strict';

const electron = require('electron');
const ipcMain = electron.ipcMain;
const path = require('path');
const fs = require('fs');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { initCrashReporterMain, initCrashReporterRenderer } = require('../crashReporter.js');
const i18n = require('../translation/i18n');
const { isMac } = require('./../utils/misc.js');

const baseWindowConfig = {
    width: 592,
    height: 48,
    show: false,
    modal: true,
    frame: false,
    focusable: false,
    transparent: true,
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    alwaysOnTop: true,
    webPreferences: {
        preload: path.join(__dirname, 'renderer.js'),
        sandbox: true,
        nodeIntegration: false,
        devTools: false
    }
};

function getTemplatePath() {
    let templatePath = path.join(__dirname, 'screen-sharing-indicator.html');
    try {
        fs.statSync(templatePath).isFile();
    } catch (err) {
        log.send(logLevels.ERROR, `screen-sharing-indicator: Could not find template ("${templatePath}").`);
    }
    return `file://${templatePath}`;
}

function openScreenSharingIndicator(eventSender, displayId, id) {
    const indicatorScreen = (displayId && electron.screen.getAllDisplays().filter(d => displayId.includes(d.id))[0]) || electron.screen.getPrimaryDisplay();
    const screenRect = indicatorScreen.workArea;
    const windowConfig = Object.assign({}, baseWindowConfig, {
        x: screenRect.x + Math.round((screenRect.width - baseWindowConfig.width) / 2),
        y: screenRect.y + screenRect.height - baseWindowConfig.height
    });

    const indicatorWindow = new electron.BrowserWindow(windowConfig);
    indicatorWindow.setVisibleOnAllWorkspaces(true);
    indicatorWindow.setMenu(null);
    indicatorWindow.loadURL(getTemplatePath());

    indicatorWindow.once('ready-to-show', () => {
        indicatorWindow.show();
    });

    indicatorWindow.webContents.on('did-finish-load', () => {
        initCrashReporterMain({ process: 'screen sharing indicator window' });
        initCrashReporterRenderer(indicatorWindow, { process: 'render | screen sharing indicator window' });
        indicatorWindow.webContents.send('window-data', {
            id,
            i18n: i18n.getMessageFor('ScreenSharingIndicator'),
            isMac
        });
    });

    indicatorWindow.webContents.on('crashed', (event, killed) => {

        log.send(logLevels.INFO, `Screen Sharing Indicator Window crashed! Killed? ${killed}`);

        if (killed) {
            return;
        }

        const errorDialogOptions = {
            type: 'error',
            title: i18n.getMessageFor('Renderer Process Crashed'),
            message: i18n.getMessageFor('Oops! Looks like we have had a crash.'),
            buttons: ['Close']
        };
        electron.dialog.showMessageBox(errorDialogOptions, () => indicatorWindow.close());
    });

    const handleStopSharingClicked = (event, indicatorId) => {
        if (indicatorId === id) {
            eventSender.send('stop-sharing-requested', id);
        }
    };

    const handleDestroyScreensharingIndicator = (event, indicatorId) => {
        if (indicatorId === id) {
            if (!indicatorWindow.isDestroyed()) {
                indicatorWindow.close();
            }
            ipcMain.removeListener('stop-sharing-clicked', handleStopSharingClicked);
            ipcMain.removeListener('destroy-screensharing-indicator', handleDestroyScreensharingIndicator);
        }
    };

    ipcMain.on('stop-sharing-clicked', handleStopSharingClicked);
    ipcMain.on('destroy-screensharing-indicator', handleDestroyScreensharingIndicator);
}

module.exports = {
    openScreenSharingIndicator
};
