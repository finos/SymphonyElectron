'use strict';
var cm = require('electron-context-menu');

/**
 * Creates & applies Right Click Context Menu based on 
 * electron-context-menu library o all windows.
 * Unless activated on edittable field, Reload option is shown.
 * Enabled Cut/Copy/Paste/Delete/Select all on text.
 * Enabled Save Image on images
 * Enabled Copy Link on href Link
 * Inspect Element is not enabled.
 */
function contextMenu(browserWindow){
    cm({
        browserWindow,
        
        prepend: (params) => [
            {
                role: 'reload',
                enabled: params.isEditable === false,
                visible: params.isEditable === false
            },
            {
                role: 'undo',
                enabled: params.isEditable && params.editFlags.canUndu,
                visible: params.isEditable
            },
            {
                role: 'redo',
                enabled: params.isEditable && params.editFlags.canRedo,
                visible: params.isEditable
            }
        ],
        append: (params) => [
            {
                role: 'delete',
                enabled: params.isEditable && params.editFlags.canDelete,
                visible: params.isEditable
            },
            {
                role: 'selectall',
                enabled: params.isEditable && params.editFlags.canSelectAll,
                visible: params.isEditable
            }
        ],

        showInspectElement: false
    });
}

module.exports = contextMenu;