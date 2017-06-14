'use strict';

const electron = require('electron');
const ipc = electron.ipcRenderer;

let availableScreens;
let selectedPosition;
let selectedScreen;

renderSettings();

// Method that renders the data from user config
function renderSettings() {

    document.addEventListener('DOMContentLoaded', function () {
        let okButton = document.getElementById('ok-button');
        let cancel = document.getElementById('cancel');

        okButton.addEventListener('click', function () {
            selectedPosition = document.querySelector('input[name="position"]:checked').value;
            let selector = document.getElementById('screen-selector');
            selectedScreen = selector.options[selector.selectedIndex].value;

            // update the user selected data and close the window
            updateAndClose();
        });

        cancel.addEventListener('click', function () {
            ipc.send('close-alert');
        });

    });

}

function updateAndClose() {
    ipc.send('update-config', {notfPosition: selectedPosition, notfScreen: selectedScreen});
    ipc.send('close-alert');
}

ipc.on('notfPosition', (event, args) => {
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
                document.getElementById('upper-right').checked = true;
                break;
        }
    }
});

ipc.on('notfScreen', (event, args) => {
    if (args && args.screen) {
        if (availableScreens) {
            let index = availableScreens.findIndex((item) => {
                return item.id === args.screen;
            });
            if (index !== -1){
                let option = document.getElementById(availableScreens[index].id);

                if (option){
                    option.selected = true;
                }
            }
        }
    }
});

ipc.on('screens', (event, screens) => {
    availableScreens = screens;
    let screenSelector = document.getElementById('screen-selector');

    if (screenSelector && screens){
        screens.forEach((scr, index) => {
            let option = document.createElement('option');
            option.value = scr.id;
            option.id = scr.id;
            option.innerHTML = index + 1;
            screenSelector.appendChild(option);
        });
    }
});