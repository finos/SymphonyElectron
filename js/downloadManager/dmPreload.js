'use strict';

const { ipcRenderer } = require('electron');
const apiEnums = require('../enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;

const local = {
    ipcRenderer: ipcRenderer,
    downloadItems: []
};

// Listen for file download complete event
local.ipcRenderer.on('downloadCompleted', (event, arg) => {
    createDOM(arg);
});

// Listen for file download progress event
local.ipcRenderer.on('downloadProgress', () => {
    initiate();
});

/**
 * Open file in default app.
 * @param id
 */
function openFile(id) {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.openFile,
        id: id
    });
}

/**
 * Show downloaded file in explorer or finder.
 * @param id
 */
function showInFinder(id) {
    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.showInFinder,
        id: id
    });
}

function clearDownloadData() {
    local.downloadItems = [];

    local.ipcRenderer.send(apiName, {
        cmd: apiCmds.clearDownloadData
    });
}

/**
 * Create the document object model
 * @param arg
 */
function createDOM(arg) {

    if (arg && arg._id) {
        let fileDisplayName = getFileDisplayName(arg.fileName);
        let downloadItemKey = arg._id;

        local.downloadItems.push(arg);

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
            h2FileName.innerHTML = fileDisplayName;
            h2FileName.title = fileDisplayName;
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
                local.ipcRenderer.send(apiName, {
                    cmd: apiCmds.openFile,
                    count: 1
                });
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

/**
 * Initiate the download manager
 */
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
                clearDownloadData();
                document.getElementById('footer').classList.add('hidden');
                document.getElementById('download-main').innerHTML = '';
            });
        }
    }
}

/**
 * Return a file display name for the download item
 */
function getFileDisplayName(fileName) {
    let fileList = local.downloadItems;
    let fileNameCount = 0;
    let fileDisplayName = fileName;
    
    /* Check if a file with the same name exists
     * (akin to the user downloading a file with the same name again)
     * in the download bar
     */
    for (let i = 0; i < fileList.length; i++) {
        if (fileName === fileList[i].fileName) {
            fileNameCount++;
        }
    }
    
    /* If it exists, add a count to the name like how Chrome does */
    if (fileNameCount) {
        let extLastIndex = fileDisplayName.lastIndexOf('.');
        let fileCount = ' (' + fileNameCount + ')';
        
        fileDisplayName = fileDisplayName.slice(0, extLastIndex) + fileCount + fileDisplayName.slice(extLastIndex);
    }
    
    return fileDisplayName;
}