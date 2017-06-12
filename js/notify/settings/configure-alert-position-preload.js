'use strict';

const electron = require('electron');
const ipc = electron.ipcRenderer;

renderSettings();

function renderSettings() {

    document.addEventListener('DOMContentLoaded', function () {
        let okButton = document.getElementById('ok-button');
        let cancel = document.getElementById('cancel');

        okButton.addEventListener('click', function () {
            let value = document.querySelector('input[name="position"]:checked').value;

            let config = {
                fieldName: 'notfPosition',
                value: value
            };
            ipc.send('update-config', config);
            ipc.send('close-alert');
        });

        cancel.addEventListener('click', function () {
            ipc.send('close-alert');
        });

    });

}

ipc.on('notfConfig', (event, args) => {
    if (args && args.position){
        switch (args.position) {
            case 'upper-right':
                document.getElementById('upper-right').checked = true;
                break;
            case 'lower-right':
                document.getElementById('lower-right').checked = true;
                break;
            case 'lower-left':
                document.getElementById('lower-left').checked = true;
                break;
            case 'upper-left':
                document.getElementById('upper-left').checked = true;
                break;
            default:
                document.getElementById('upper-left').checked = true;
                break;
        }
    }
});

ipc.on('screens', (event, screens) => {
    console.log(screens);
    let screenSelector = document.getElementById('screen-selector');

    if (screenSelector){
        screens.forEach((s, index) => {
            let option = document.createElement('option');
            option.value = index;
            option.innerHTML = index;
            screenSelector.appendChild(option);
        });
    }
});