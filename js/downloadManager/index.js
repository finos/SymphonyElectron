'use strict';

const { ipcRenderer, remote } = require('electron');

const local = {
    ipcRenderer: ipcRenderer,
    downloadItems: []
};

// listen for file download complete event
local.ipcRenderer.on('downloadCompleted', (event, arg) => {
    createDOM(arg);
});

// listen for file download progress event
local.ipcRenderer.on('downloadProgress', () => {
    initiate();
});

/**
 * Open file in default app.
 */
function openFile(id) {
    let fileIndex = local.downloadItems.findIndex((item) => {
        return item._id === id
    });
    if (fileIndex !== -1) {
        let openResponse = remote.shell.openExternal(`file:///${local.downloadItems[fileIndex].savedPath}`);
        if (!openResponse) {
            remote.dialog.showErrorBox("File not found", 'The file you are trying to open cannot be found in the specified path.');
        }
    }
}

/**
 * Show downloaded file in explorer or finder.
 */
function showInFinder(id) {
    let showFileIndex = local.downloadItems.findIndex((item) => {
        return item._id === id
    });
    if (showFileIndex !== -1) {
        let showResponse = remote.shell.showItemInFolder(local.downloadItems[showFileIndex].savedPath);
        if (!showResponse) {
            remote.dialog.showErrorBox("File not found", 'The file you are trying to access cannot be found in the specified path.');
        }
    }
}

function createDOM(arg) {

    if (arg && arg._id) {

        local.downloadItems.push(arg);
        let downloadItemKey = arg._id;

        let ul = document.getElementById('download-main');
        if (ul) {

            let li = document.createElement('li');
            li.id = downloadItemKey;
            li.classList.add('download-element');
            ul.insertBefore(li, ul.childNodes[0]);

            let itemDiv = document.createElement('div');
            itemDiv.classList.add('download-item');
            itemDiv.id = 'dl-item';
            li.appendChild(itemDiv);
            let openMainFile = document.getElementById('dl-item');
            openMainFile.addEventListener('click', () => {
                let id = openMainFile.parentNode.id;
                openFile(id);
            });

            let fileDetails = document.createElement('div');
            fileDetails.classList.add('file');
            itemDiv.appendChild(fileDetails);

            let downProgress = document.createElement('div');
            downProgress.id = 'download-progress';
            downProgress.classList.add('download-complete');
            downProgress.classList.add('flash');
            setTimeout(() => {
                downProgress.classList.remove('flash');
            }, 4000);
            fileDetails.appendChild(downProgress);

            let fileIcon = document.createElement('span');
            fileIcon.classList.add('tempo-icon');
            fileIcon.classList.add('tempo-icon--download');
            fileIcon.classList.add('download-complete-color');
            setTimeout(() => {
                fileIcon.classList.remove('download-complete-color');
                fileIcon.classList.remove('tempo-icon--download');
                fileIcon.classList.add('tempo-icon--document');
            }, 4000);
            downProgress.appendChild(fileIcon);

            let fileNameDiv = document.createElement('div');
            fileNameDiv.classList.add('downloaded-filename');
            itemDiv.appendChild(fileNameDiv);

            let h2FileName = document.createElement('h2');
            h2FileName.classList.add('text-cutoff');
            h2FileName.innerHTML = arg.fileName;
            fileNameDiv.appendChild(h2FileName);

            let fileProgressTitle = document.createElement('span');
            fileProgressTitle.id = 'per';
            fileProgressTitle.innerHTML = arg.total + ' Downloaded';
            fileNameDiv.appendChild(fileProgressTitle);

            let caret = document.createElement('div');
            caret.id = 'menu';
            caret.classList.add('caret');
            caret.classList.add('tempo-icon');
            caret.classList.add('tempo-icon--dropdown');
            li.appendChild(caret);

            let actionMenu = document.createElement('div');
            actionMenu.id = 'download-action-menu';
            actionMenu.classList.add('download-action-menu');
            caret.appendChild(actionMenu);

            let caretUL = document.createElement('ul');
            caretUL.id = downloadItemKey;
            actionMenu.appendChild(caretUL);

            let caretLiOpen = document.createElement('li');
            caretLiOpen.id = 'download-open';
            caretLiOpen.innerHTML = 'Open';
            caretUL.appendChild(caretLiOpen);
            let openFileDocument = document.getElementById('download-open');
            openFileDocument.addEventListener('click', () => {
                let id = openFileDocument.parentNode.id;
                openFile(id);
            });

            let caretLiShow = document.createElement('li');
            caretLiShow.id = 'download-show-in-folder';
            caretLiShow.innerHTML = 'Show in Folder';
            caretUL.appendChild(caretLiShow);
            let showInFinderDocument = document.getElementById('download-show-in-folder');
            showInFinderDocument.addEventListener('click', () => {
                let id = showInFinderDocument.parentNode.id;
                showInFinder(id);
            });
        }
    }
}

function initiate() {
    let mainFooter = document.getElementById('footer');
    let mainDownloadDiv = document.getElementById('download-manager-footer');

    if (mainDownloadDiv) {

        mainFooter.classList.remove('hidden');

        let ulFind = document.getElementById('download-main');

        if (!ulFind) {
            let uList = document.createElement('ul');
            uList.id = 'download-main';
            mainDownloadDiv.appendChild(uList);
        }

        let closeSpanFind = document.getElementById('close-download-bar');

        if (!closeSpanFind) {
            let closeSpan = document.createElement('span');
            closeSpan.id = 'close-download-bar';
            closeSpan.classList.add('close-download-bar');
            closeSpan.classList.add('tempo-icon');
            closeSpan.classList.add('tempo-icon--close');
            mainDownloadDiv.appendChild(closeSpan);
        }

        let closeDownloadManager = document.getElementById('close-download-bar');
        if (closeDownloadManager) {
            closeDownloadManager.addEventListener('click', () => {
                local.downloadItems = [];
                document.getElementById('footer').classList.add('hidden');
                document.getElementById('download-main').innerHTML = '';
            });
        }
    }
}