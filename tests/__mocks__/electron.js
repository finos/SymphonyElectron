const path = require('path');
const EventEmitter = require('events');

let ipcEmitter = new EventEmitter();

// use config provided by test framework
function pathToConfigDir() {
    return path.join(__dirname, '/../fixtures');
}

// electron app mock...
const app = {
    getAppPath: pathToConfigDir,
    getPath: function(type) {
        if (type === 'exe') {
            return path.join(pathToConfigDir(), '/Symphony.exe');
        }
        return pathToConfigDir();
    },
    on: function() {
        // no-op
    }
};

// simple ipc mocks for render and main process ipc using
// nodes' EventEmitter
const ipcMain = {
    on: function(event, cb) {
        ipcEmitter.on(event, cb);
    },
    send: function (event, args) {
        const senderEvent = {
            sender: {
                send: function (event, arg) {
                    ipcEmitter.emit(event, arg);
                }
            }
        };
        ipcEmitter.emit(event, senderEvent, args);
    },
};

const ipcRenderer = {
    sendSync: function(event, args) {
        let listeners = ipcEmitter.listeners(event);
        if (listeners.length > 0) {
            let listener = listeners[0];
            const eventArg = {};
            listener(eventArg, args);
            return eventArg.returnValue;
        }
        return null;
    },
    send: function(event, args) {
        const senderEvent = {
            sender: {
                send: function (event, arg) {
                    ipcEmitter.emit(event, arg);
                }
            }
        };
        ipcEmitter.emit(event, senderEvent, args);
    },
    on: function(eventName, cb) {
        ipcEmitter.on(eventName, cb);
    },
    removeListener: function(eventName, cb) {
        ipcEmitter.removeListener(eventName, cb);
    }
};

module.exports = {
  require: jest.genMockFunction(),
  match: jest.genMockFunction(),
  app: jest.genMockFunction(),
  ipcMain: ipcMain,
  ipcRenderer: ipcRenderer,
  remote: jest.genMockFunction(),
  dialog: jest.genMockFunction()
};
