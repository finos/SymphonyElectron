'use strict';

const { ipcRenderer } = require('electron');

const apiEnums = require('../enums/api.js');
const proxyCmds = apiEnums.proxyCmds;

/**
 * Creates and returns a proxy (in renderer process) that will use IPC
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
 * used.  Would like to incorporate: https://github.com/EvolveLabs/electron-weak
 *
 * @param  {Class}  ApiClass  reference to prototype/class constructor.
 * @return {object}           proxy for ApiClass.
 */
function createProxy(ApiClass) {
    return new Proxy(ApiClass, constructorHandler);
}

let id = 1;
function uniqueId() {
    return id++;
}

let constructorHandler = {
    construct: function(target, argumentsList) {
        var arg = {
            className: target.name,
            constructorArgsArray: argumentsList
        };

        var objId = ipcRenderer.sendSync(proxyCmds.createObject, arg);

        if (!objId) {
            throw new Error('can not create obj: ' + target.name);
        }

        var ProxyClass = new target();
        ProxyClass._objId = objId;
        ProxyClass._callbacks = new WeakMap();

        let instanceHandler = {
            get: instanceGetHandler,
            set: instanceSetHandler
        }

        // work like to incorporate something like https://github.com/EvolveLabs/electron-weak
        // here to tell when object is destroyed so we can ipc main process to
        // loss ref to liveObj.

        return new Proxy(ProxyClass, instanceHandler);
    },

    // static getter and method handler
    get: staticGetHandler
}

function instanceGetHandler(target, name) {
    // all methods and getters we support should be on the prototype
    let prototype = Object.getPrototypeOf(target);
    let desc = Object.getOwnPropertyDescriptor(prototype, name);

    // does this have a "getter"
    if (desc && desc.get) {
        return getHandler(target, name, false);
    }
    // does this have a method
    if (desc && typeof desc.value === 'function') {
        if (name === 'addEventListener') {
            return addEventHandler(target);
        }

        if (name === 'removeEventListener') {
            return removeEventHandler(target);
        }

        return methodHandler(target, name, false);
    }

    return null;
}

function addEventHandler(target) {
    return function(eventName, callback) {
        var callbackId = eventName + uniqueId();
        var args = {
            callbackId: callbackId,
            objId: target._objId,
            eventName: eventName
        };
        ipcRenderer.send(proxyCmds.addEvent, args);

        let callbackFunc = function(arg) {
            if (arg.callbackId === callbackId) {
                // special destroy callback so we can clean up event listeners.
                if (arg.type === 'destroy') {
                    ipcRenderer.removeListener(proxyCmds.eventCallback,
                        callbackFunc);
                    target._callbacks.delete(callbackFunc);
                    return;
                }
                callback({
                    target: this,
                    type: eventName,
                    result: arg.result
                });
            }
        }.bind(this);

        ipcRenderer.on(proxyCmds.eventCallback, callbackFunc);

        target._callbacks.set(callback, {
            callbackId: callbackId,
            callbackFunc: callbackFunc
        });

    }
}

function removeEventHandler(target) {
    return function(eventName, callback) {
        if (target._callbacks && target._callbacks.has(callback)) {
            let callbackObj = target._callbacks.get(callback);

            let args = {
                eventName: eventName,
                callbackId: callbackObj.callbackId,
                objId: target._objId
            }

            ipcRenderer.removeListener(proxyCmds.eventCallback,
                callbackObj.callbackFunc);

            ipcRenderer.send(proxyCmds.removeEvent, args);

            target._callbacks.delete(callback);
        }
    }
}

function methodHandler(target, methodName, isStatic) {
    return function(...argPassedToMethod) {
        return new Promise(function(resolve, reject) {
            var invokeId = methodName + uniqueId();
            var args = {
                invokeId: invokeId,
                objId: target._objId,
                methodName: methodName,
                arguments: argPassedToMethod,
                isStatic: isStatic,
                className: target.name
            }

            if (!isStatic) {
                args.objId = target._objId;
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

function getHandler(target, property, isStatic) {
    return new Promise(function(resolve, reject) {
        var getterId = property + uniqueId();
        var args = {
            getterId: getterId,
            getterProperty: property,
            isStatic: isStatic,
            className: target.name
        }

        if (!isStatic) {
            args.objId = target._objId;
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

function instanceSetHandler(target, property, value) {
    let prototype = Object.getPrototypeOf(target);
    let desc = Object.getOwnPropertyDescriptor(prototype, property);
    if (desc && desc.set) {
        var args = {
            objId: target._objId,
            setterProperty: property,
            setterValue: value
        }

        ipcRenderer.sendSync(proxyCmds.set, args);
        return true;
    }

    return false;
}

function staticGetHandler(target, name) {
    // all methods and getters we support should be on the prototype
    let desc = Object.getOwnPropertyDescriptor(target, name);

    // does this have a static "getter"
    if (desc && desc.get) {
        return getHandler(target, name, true);
    }
    // does this have a static method
    if (desc && typeof desc.value === 'function') {
        return methodHandler(target, name, true);
    }

    return null;
}


module.exports = createProxy
