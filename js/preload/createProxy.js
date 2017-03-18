'use strict';

const { ipcRenderer } = require('electron');

const apiEnums = require('../enums/api.js');
const proxyCmds = apiEnums.proxyCmds;

let id = 0;
function uniqueId() {
    return id++;
}

let constructorHandler = {
    construct: function(target, argumentsList, newTarget) {
        var arg = {
            className: target.name,
            constructorArgs: argumentsList
        };

        var objId = ipcRenderer.sendSync(proxyCmds.createObject, arg);

        if (!objId) {
            throw new Error('can not create obj: ' + target.name);
        }

        var n = new target();
        n._objId = objId;
        n._callbacks = new WeakMap();

        return n;
    }
}

function handleAddEvent(target) {
    return function(eventName, callback) {
        var callbackId = eventName + uniqueId();
        var args = {
            callbackId: callbackId,
            objId: target._objId,
            eventName: eventName
        };
        ipcRenderer.send(proxyCmds.addEvent, args);

        let callbackFunc = function(arg) {
            if (arg.callbackId === arg.callbackId) {
                callback(args.result);
            }
        }

        ipcRenderer.on(proxyCmds.eventCallback, callbackFunc);

        target._callbacks.set(callback, {
            callbackId: callbackId,
            callbackbackFunc: callbackFunc
        });

    }
}

function handleRemoveEvent(target) {
    return function(eventName, callback) {
        if (target._callbacks && target._callback.has(callback)) {
            let callbackObj = target._callback.get(callback);

            let args = {
                eventName: eventName,
                callbackId: callbackObj.callbackId,
                objId: target._objId
            }

            ipcRenderer.removeListener(proxyCmds.eventCallback,
                callbackObj.callbackbackFunc);

            ipcRenderer.send(proxyCmds.removeEvent, args);

            target._callbacks.delete(callback);
        }
    }
}

function handleMethod(target, methodName) {
    return function() {
        var argPassedIn = arguments;
        return new Promise(function(resolve, reject) {
            var invokeId = methodName + uniqueId();
            var args = {
                invokeId: invokeId,
                objId: target._objId,
                methodName: methodName,
                arguments: argPassedIn
            }

            ipcRenderer.on(proxyCmds.invokeResult, resultCallback);
            ipcRenderer.send(proxyCmds.invokeMethod, args);

            function removeEventListener() {
                ipcRenderer.removeListener(proxyCmds.invokeResult,
                    resultCallback);
            }
            function resultCallback(arg) {
                if (arg.invokeId === invokeId) {
                    window.clearTimeout(timer);
                    removeEventListener();
                    if (arg.error) {
                        reject('method called failed: ' + arg.error);
                    } else {
                        resolve(arg.returnValue);
                    }
                }
            }

            // timeout in case we never hear anything back from main process
            let timer = setTimeout(function() {
                removeEventListener();
                reject('timeout_no_reponse');
            }, 5000);
        });
    }
}

function getHandler(target, property) {
    return new Promise(function(resolve, reject) {
        var getterId = name + uniqueId();
        var args = {
            getterId: getterId,
            objId: target._objId,
            getterProperty: property
        }

        ipcRenderer.on(proxyCmds.getResult, resultCallback);
        ipcRenderer.send(proxyCmds.get, args);

        function removeEventListener() {
            ipcRenderer.removeListener(proxyCmds.getResult,
                resultCallback);
        }
        function resultCallback(arg) {
            if (arg.getterId === getterId) {
                window.clearTimeout(timer);
                removeEventListener();
                if (arg.error) {
                    reject('getter called failed: ' + arg.error);
                } else {
                    resolve(arg.returnValue);
                }
            }
        }

        // timeout in case we never hear anything back from main process
        let timer = setTimeout(function() {
            removeEventListener();
            reject('timeout_no_reponse');
        }, 5000);
    });
}

// function setHandler(target, property, value, receiver) {
//     var args = {
//         objId: target._objId,
//         setterName: property,
//         setterValue: value
//     }
//
//     ipcRenderer.sendSync(proxyCmds.get, args);
// }

let instanceHandler = {
    get: function(target, name, receiver) {
        // all methods and getters we support should be on the prototype
        let prototype = Reflect.getPrototypeOf(target);
        let desc = Object.getOwnPropertyDescriptor(prototype, name);

        // does this have a "getter"
        if (desc && desc.get) {
            return getHandler(target, name);
        }
        // does this have a method
        if (desc && typeof desc.value === 'function') {
            if (name === 'addEventListener') {
                return handleAddEvent(target);
            }

            if (name === 'removeEventListener') {
                return handleRemoveEvent(target);
            }

            return handleMethod(target, name);
        }

        return null;
    }
    // set: setHandler
}

/**
 * Creates and returns a proxy instance in render process that will use IPC
 * with main process where "real" instance is created.
 *
 * The constructor is executed synchronously, so take care to not block
 * processes.
 *
 * All method calls will be sent over IPC to main process, evaulated and
 * result returned back to main process.  Method calls return a promise.
 *
 * Special method calls: "addEventListener" and "removeEventListener" allow
 * attaching/detaching to events.
 *
 * Getters (e.g., x.y) will return a promise that gets fullfilled
 * when ipc returns value.
 *
 * Setters are synchronously executed (so take care).
 *
 * Note: The "real" instance should implement a destroy method (e.g., close) that
 * should be used to destroy the instance held in main process, otherwise a
 * memory leak will occur - as renderer can not know when instance is no longer
 * used.
 *
 * @param  {Class}  ApiClass  reference to prototype/class constructor.
 * @return {object}           instance of ApiClass that serves as proxy.
 */
function createProxy(ApiClass) {
    var ProxyClass = new Proxy(ApiClass, constructorHandler);
    return new Proxy(new ProxyClass(), instanceHandler);
}

module.exports = createProxy;
