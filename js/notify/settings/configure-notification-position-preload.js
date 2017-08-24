'use strict';

const electron = require('electron');
const ipc = electron.ipcRenderer;

let availableScreens;
let selectedPosition;
let selectedDisplay;

renderSettings();

/**
 * Method that renders the data from user config
 */
function renderSettings() {

    document.addEventListener('DOMContentLoaded', function () {
        let okButton = document.getElementById('ok-button');
        let cancel = document.getElementById('cancel');

        okButton.addEventListener('click', function () {
            selectedPosition = document.querySelector('input[name="position"]:checked').value;
            let selector = document.getElementById('screen-selector');
            selectedDisplay = selector.options[selector.selectedIndex].value;

            // update the user selected data and close the window
            updateAndClose();
        });

        cancel.addEventListener('click', function () {
            ipc.send('close-alert');
        });

    });

}

/**
 * Updates the configuration and closes the alert
 */
function updateAndClose() {
    ipc.send('update-config', {position: selectedPosition, display: selectedDisplay});
    ipc.send('close-alert');
}

ipc.on('notificationSettings', (event, args) => {
    // update position from user config
    if (args && args.position) {
        document.getElementById(args.position).checked = true;
    }

    // update selected display from user config
    if (args && args.display) {
        if (availableScreens) {
            let index = availableScreens.findIndex((item) => {
                let id = item.id.toString();
                return id === args.display;
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

        // clearing the previously added content to
        // make sure the content is not repeated
        screenSelector.innerHTML = '';

        screens.forEach((scr, index) => {
            let option = document.createElement('option');
            option.value = scr.id;
            option.id = scr.id;
            option.innerHTML = index + 1;
            screenSelector.appendChild(option);
        });
    }
});