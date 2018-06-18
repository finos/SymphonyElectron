'use strict';

const electron = require('electron');
let downloadItems = [];

function openFile(id) {
    let fileIndex = downloadItems.findIndex((item) => {
        return item._id === id;
    });

    if (fileIndex !== -1) {
        electron.dialog.showMessageBox({
            type: 'warning',
            buttons: ['Cancel', 'Proceed'],
            defaultId: 1,
            cancelId: 0,
            title: 'Open File',
            message: 'This file type may not be safe to open. Are you sure you want to open it?'
        }, function (index) {
            if (index === 1) {
                let openResponse = electron.shell.openExternal(`file:///${downloadItems[fileIndex].savedPath}`);
                let focusedWindow = electron.BrowserWindow.getFocusedWindow();
                if (!openResponse && focusedWindow && !focusedWindow.isDestroyed()) {
                    electron.dialog.showMessageBox(focusedWindow, {
                        type: 'error',
                        title: 'File not found',
                        message: 'The file you are trying to open cannot be found in the specified path.'
                    });
                }
            }
        });
    }
}

function showInFinder(id) {
    let fileIndex = downloadItems.findIndex((item) => {
        return item._id === id;
    });

    if (fileIndex !== -1) {
        let showResponse = electron.shell.showItemInFolder(downloadItems[fileIndex].savedPath);
        let focusedWindow = electron.BrowserWindow.getFocusedWindow();
        if (!showResponse && focusedWindow && !focusedWindow.isDestroyed()) {
            electron.dialog.showMessageBox(focusedWindow, {
                type: 'error',
                title: 'File not found',
                message: 'The file you are trying to open cannot be found in the specified path.'
            });
        }
    }
}

function setDownloadData(data) {
    downloadItems.push(data);
}

function clearDownloadData() {
    downloadItems = [];
}

module.exports = {
    openFile: openFile,
    showInFinder: showInFinder,
    setDownloadData: setDownloadData,
    clearDownloadData: clearDownloadData
};