'use strict';

/**
 * This module runs in the main process and handles api calls
 * from the renderer process.
 */
const electron = require('electron');

const windowMgr = require('./windowMgr.js');
const log = require('./log.js');
const badgeCount = require('./badgeCount.js');

const apiEnums = require('./enums/api.js');
const apiCmds = apiEnums.cmds;
const apiName = apiEnums.apiName;
const apiProxyCmds = apiEnums.proxyCmds

/**
 * Ensure events comes from a window that we have created.
 * @param  {EventEmitter} event  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
function isValidWindow(event) {
    var result = false;
    if (event && event.sender) {
        // validate that event sender is from window we created
        const browserWin = electron.BrowserWindow.fromWebContents(event.sender);
        const winKey = event.sender.browserWindowOptions &&
            event.sender.browserWindowOptions.webPreferences &&
            event.sender.browserWindowOptions.webPreferences.winKey;

        result = windowMgr.hasWindow(browserWin, winKey);
    }

    if (!result) {
        /* eslint-disable no-console */
        console.log('invalid window try to perform action, ignoring action.');
        /* eslint-enable no-console */
    }

    return result;
}

/**
 * Handle API related ipc messages from renderers. Only messages from windows
 * we have created are allowed.
 */
electron.ipcMain.on(apiName, (event, arg) => {
    if (!isValidWindow(event)) {
        return;
    }

    if (!arg) {
        return;
    }

    // if (arg.cmd === apiCmds.showNotification) {
    //     const rendererNotfId = arg.rendererNotfId;
    //     const notify = require('./notify/notify.js');
    //     var id = notify.notify({
    //         title: arg.title,
    //         text: arg.text,
    //         flash: true,
    //         color: 'blue',
    //         image: 'https://qa4.symphony.com//avatars/qa4/50/206158433167/-DzfqZcAt4pzted_1mhlC5ZPh4GKRVnrp6XYm2RqnLI.png'
    //     });
    //
    //     event.sender.send('notification-id', {
    //         rendererNotfId: rendererNotfId,
    //         mainNotfId: id
    //      });
    // }
    //
    // if (arg.cmd === apiCmds.subscribeNotification) {
    //     let notifId = arg.id
    //     let eventName = arg.eventName
    //     notify.subscribe(notifId, eventName, function() {
    //         event.sender.send('notification-event', { id:notifId, eventName: eventName })
    //     });
    // }

    if (arg.cmd === apiCmds.isOnline && typeof arg.isOnline === 'boolean') {
        windowMgr.setIsOnline(arg.isOnline);
        return;
    }

    if (arg.cmd === apiCmds.setBadgeCount && typeof arg.count === 'number') {
        badgeCount.show(arg.count);
        return;
    }

    if (arg.cmd === apiCmds.badgeDataUrl && typeof arg.dataUrl === 'string' &&
        typeof arg.count === 'number') {
        badgeCount.setDataUrl(arg.dataUrl, arg.count);
        return;
    }

    if (arg.cmd === apiCmds.registerLogger) {
        // renderer window that has a registered logger from JS.
        log.setLogWindow(event.sender);
        return;
    }

    if (arg.cmd === apiCmds.open && typeof arg.url === 'string') {
        let title = arg.title || 'Symphony';
        let width = arg.width || 1024;
        let height = arg.height || 768;
        windowMgr.createChildWindow(arg.url, title, width, height);
    }
});

const Notify = require('./notify/notifyImplementation.js');

// holds all project classes that can be created.
const api = {
    Notify: Notify
}

// holds all proxy object instances
let liveObjs = {};

let id = 1;
function uniqueId() {
    return id++;
}

electron.ipcMain.on(apiProxyCmds.createObject, function(event, args) {
    if (!isValidWindow(event)) {
        event.returnValue = null;
        return;
    }

    if (args.objectName && api[args.objectName]) {
        var obj = new api[args.objectName];
        obj._callbacks = {};

        let objId = uniqueId();
        liveObjs[objId] = obj;

        obj.addEventListener('destroy', function() {
            var liveObj = liveObjs[objId];
            if (liveObj) {
                delete liveObjs[objId];
            }
        });

        event.returnValue = objId;
    } else {
        event.returnValue = null;
    }
});

electron.ipcMain.on(apiProxyCmds.invokeMethod, function(event, args) {
    if (!isValidWindow(event) || !args.invokeId) {
        return;
    }

    if (!args.objId || !liveObjs[args.objId]) {
        event.sender.send(apiProxyCmds.invokeResult, {
            error: 'calling obj is not present',
            invokeId: args.invokeId
        });
        return;
    }

    let obj = liveObjs[args.objId];

    if (!args.methodName || !obj[args.methodName]) {
        event.sender.send(apiProxyCmds.invokeResult, {
            error: 'no such method',
            invokeId: args.invokeId
        });
        return;
    }

    // special method to lose ref to obj
    if (args.methodName === 'destroy') {
        console.log('destroying object');
        delete liveObjs[args.objId];
    }

    var funcArgs = args.arguments || [];

    var result = obj[args.methodName](funcArgs);

    event.sender.send(apiProxyCmds.invokeResult, {
        returnValue: result,
        invokeId: args.invokeId
    });
});

electron.ipcMain.on(apiProxyCmds.get, function(event, args) {
    if (!isValidWindow(event)) {
        return;
    }
    // ToDo
});

electron.ipcMain.on(apiProxyCmds.set, function(event, args) {
    if (!isValidWindow(event)) {
        return;
    }
    // ToDo
});

electron.ipcMain.on(apiProxyCmds.addEvent, function(event, args) {
    if (!isValidWindow(event)) {
        return;
    }
    if (!args.objId || !liveObjs[args.objId]) {
        console.log('calling obj is not present');
        return;
    }

    if (!args.callbackId) {
        console.log('no callback id provided');
        return;
    }

    if (!args.eventName) {
        console.log('no eventName provided');
        return;
    }

    let obj = liveObjs[args.objId];
    let callbackFunc = function(result) {
        console.log('event listener in main process invoked');
        event.sender.send(apiProxyCmds.eventCallback, {
            callbackId: args.callbackId,
            result: result
        });
    }
    obj._callbacks[args.callbackId] = callbackFunc;
    obj.addEventListener(args.eventName, callbackFunc);
});

electron.ipcMain.on(apiProxyCmds.removeEvent, function(event, args) {
    if (!isValidWindow(event)) {
        return;
    }

    if (!args.objId || !liveObjs[args.objId]) {
        console.log('calling obj is not present');
        return;
    }

    if (!args.callbackId) {
        console.log('no callback id provided');
        return;
    }

    if (!args.eventName) {
        console.log('no eventName provided');
        return;
    }

    let obj = liveObjs[args.objId];
    let callbackFunc = obj._callbacks[args.callbackId];
    if (typeof callbackFunc === 'function') {
        obj.removeEventListener(args.eventName, callbackFunc);
    }
});
