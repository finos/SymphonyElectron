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

// can be overridden for testing
let checkValidWindow = true;

/**
 * Ensure events comes from a window that we have created.
 * @param  {EventEmitter} event  node emitter event to be tested
 * @return {Boolean} returns true if exists otherwise false
 */
function isValidWindow(event) {
    if (!checkValidWindow) {
        return true;
    }
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

const Notify = require('./notify/notifyImpl.js');

// holds all project classes that can be created.
let api = {
    Notify: Notify
}

// holds all proxy object instances
let liveObjs = {};

let id = 1;
function uniqueId() {
    return id++;
}

/**
 * Creates instance of given class for proxy in renderer process.
 *
 *  @param  {Object} args {
 *   className {String} name of class to create.
 *  }
 *
 * @return {Number} unique id for class intance created.
 */
electron.ipcMain.on(apiProxyCmds.createObject, function(event, args) {
    if (!isValidWindow(event)) {
        setResult(null);
        return;
    }

    function setResult(value) {
        /* eslint-disable no-param-reassign */
        event.returnValue = value;
        /* eslint-enable no-param-reassign */
    }

    if (args.className && api[args.className]) {
        var obj = new api[args.className](...args.constructorArgsArray);
        obj._callbacks = {};

        let objId = uniqueId();
        liveObjs[objId] = obj;

        if (typeof obj.addEventListener === 'function') {
            obj.addEventListener('destroy', function() {
                var liveObj = liveObjs[objId];
                if (liveObj) {
                    delete liveObjs[objId];
                }
            });
        }

        setResult(objId);
    } else {
        setResult(null);
    }
});

/**
 * Invokes a method for the proxy.
 *
 *  @param  {Object} args {
 *   objId {Number} id of object previously created, not needed for static call.
 *   invokeId {Number} id used by proxy to uniquely identify this method call
 *   methodName {String} name of method to call
 *   arguments: {Array} arguments to invoke method with.
 *   isStatic: {bool} true is this is a static method.
 *   className {String} name of class on which func is invoked.
 *  }
 *
 * @return {Object} {
 *    returnValue {Object} result of calling method
 *    invokeId {Number} id so proxy can identify method call
 *  }
 */
electron.ipcMain.on(apiProxyCmds.invokeMethod, function(event, args) {
    if (!isValidWindow(event) || !args.invokeId) {
        return;
    }

    if (!args.isStatic && (!args.objId || !liveObjs[args.objId])) {
        event.sender.send(apiProxyCmds.invokeResult, {
            error: 'calling obj is not present',
            invokeId: args.invokeId
        });
        return;
    }

    // static method call must have className and class must exist in api
    if (args.isStatic) {
        if (!args.className) {
            event.sender.send(apiProxyCmds.invokeResult, {
                error: 'for static method must provide class name',
                invokeId: args.invokeId
            });
            return;
        }

        if (!api[args.className]) {
            event.sender.send(apiProxyCmds.invokeResult, {
                error: 'no class exists: ' + args.className,
                invokeId: args.invokeId
            });
            return;
        }
    }

    let result;
    let funcArgs = args.arguments || [];

    if (args.isStatic) {
        let classType = api[args.className];

        if (!args.methodName || !classType[args.methodName]) {
            event.sender.send(apiProxyCmds.invokeResult, {
                error: 'no such static method',
                invokeId: args.invokeId
            });
            return;
        }

        result = classType[args.methodName](...funcArgs);
    } else {
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
            delete liveObjs[args.objId];
        }

        result = obj[args.methodName](...funcArgs);
    }

    event.sender.send(apiProxyCmds.invokeResult, {
        returnValue: result,
        invokeId: args.invokeId
    });
});

/**
 * Getter implementation.  Allows proxy to retrieve value from implementation
 * object.
 *
 * @param  {Object} args {
 *   objId {Number} id of object previously created (not needed for static get)
 *   getterId {Number} id used by proxy to uniquely identify this getter call.
 *   getterProperty {String} name of getter property to retrieve.
 *   isStatic {boo} true if this if getter is for static property.
 *   className {String} name of class we are operating on here.
 *  }
 *
 * @return {Object} {
 *    returnValue {Object} result of calling method
 *    getterId {Number} id so proxy can identify getter call
 *  }
 */
electron.ipcMain.on(apiProxyCmds.get, function(event, args) {
    if (!isValidWindow(event) || !args.getterId) {
        return;
    }

    // non-static calls must have an live instance available
    if (!args.isStatic && (!args.objId || !liveObjs[args.objId])) {
        event.sender.send(apiProxyCmds.getResult, {
            error: 'calling obj is not present',
            getterId: args.getterId
        });
        return;
    }

    // static get must have className and class must exist in api
    if (args.isStatic) {
        if (!args.className) {
            event.sender.send(apiProxyCmds.getResult, {
                error: 'for static getter must provide class name',
                getterId: args.getterId
            });
            return;
        }

        if (!api[args.className]) {
            event.sender.send(apiProxyCmds.getResult, {
                error: 'no class exists: ' + args.className,
                getterId: args.getterId
            });
            return;
        }
    }

    if (!args.getterProperty) {
        event.sender.send(apiProxyCmds.getResult, {
            error: 'property name not provided',
            getterId: args.getterId
        });
        return;
    }

    let result;
    if (args.isStatic) {
        let classType = api[args.className]
        result = classType[args.getterProperty];
    } else {
        let obj = liveObjs[args.objId];
        result = obj[args.getterProperty];
    }

    event.sender.send(apiProxyCmds.getResult, {
        returnValue: result,
        getterId: args.getterId
    });
});

/**
 * Setter implementation.  Allows proxy to set value on implementation object.
*
* @param  {Object} args {
*   objId {Number} id of object previously created.
*   setterProperty {String} name of setter property.
*   setterValue {object} new value to set.
*  }
*
* @return {Object} input setter value
*/
electron.ipcMain.on(apiProxyCmds.set, function(event, args) {
    if (!isValidWindow(event)) {
        setResult(null);
        return;
    }

    if (!args.objId || !liveObjs[args.objId]) {
        setResult(null);
        return;
    }

    if (!args.setterProperty) {
        setResult(null);
        return;
    }

    function setResult(value) {
        /* eslint-disable no-param-reassign */
        event.returnValue = value;
        /* eslint-enable no-param-reassign */
    }

    let obj = liveObjs[args.objId];
    obj[args.setterProperty] = args.setterValue;
    setResult(args.setterValue);
});

/**
 * Listens to an event and calls back to renderer proxy when given event occurs.
 *
 *  @param  {Object} args {
 *   objId {Number} id of object previously created.
 *   callbackId {Number} id used by proxy to uniquely identify this event.
 *   eventName {String} name of event to listen for.
 *  }
 *
 * @return {Object} {
 *    result {Object} result from invoking callback.
 *    callbackId {Number} id so proxy can identify event that occurred.
 *  }
 */
electron.ipcMain.on(apiProxyCmds.addEvent, function(event, args) {
    if (!isValidWindow(event)) {
        return;
    }
    /* eslint-disable no-console */
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
    /* eslint-enable no-console */

    let obj = liveObjs[args.objId];
    let callbackFunc = function(result) {
        event.sender.send(apiProxyCmds.eventCallback, {
            callbackId: args.callbackId,
            result: result
        });
    }
    obj._callbacks[args.callbackId] = callbackFunc;
    obj.addEventListener(args.eventName, callbackFunc);
});

/**
 * Stops listening to given event.
 *
 *  @param  {Object} args {
 *   objId {Number} id of object previously created.
 *   callbackId {Number} id used by proxy to uniquely identify this event.
 *   eventName {String} name of event to listen for.
 *  }
 */
electron.ipcMain.on(apiProxyCmds.removeEvent, function(event, args) {
    if (!isValidWindow(event)) {
        return;
    }

    /* eslint-disable no-console */
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
    /* eslint-enable no-console */

    let obj = liveObjs[args.objId];
    let callbackFunc = obj._callbacks[args.callbackId];
    if (typeof callbackFunc === 'function') {
        obj.removeEventListener(args.eventName, callbackFunc);
    }
});

function addNewInterface(name, interfaceClass) {
    api[name] = interfaceClass;
}

// expose these methods primarily for testing...
module.exports = {
    addNewInterface: addNewInterface,
    shouldCheckValidWindow: function(shouldCheck) {
        checkValidWindow = shouldCheck;
    }
}
