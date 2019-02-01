import { EventEmitter } from 'events';
import * as path from 'path';
const ipcEmitter = new EventEmitter();

const mockIdleTime: number = 15;
const appName: string = 'Symphony';
const executableName: string = '/Symphony.exe';
const isReady: boolean = true;
interface IApp {
    getAppPath(): string;
    getPath(type: string): string;
    getName(): string;
    isReady(): boolean;
}
interface IIpcMain {
    on(event: any, cb: any): void;
    send(event: any, cb: any): void;
}
interface IIpcRenderer {
    sendSync(event: any, cb: any): any;
    on(eventName: any, cb: any): void;
    send(event: any, cb: any): void;
    removeListener(eventName: any, cb: any): void;
}
interface IPowerMonitor {
    querySystemIdleTime(): void;
}

// use config provided by test framework
const pathToConfigDir = (): string => {
    return path.join(__dirname, '/..') as string;
};

// electron app mock...
const app: IApp = {
    getAppPath: pathToConfigDir,
    getPath: (type) => {
        if (type === 'exe') {
            return path.join(pathToConfigDir(), executableName);
        }
        return pathToConfigDir();
    },
    getName: () => appName,
    isReady: () => isReady,
};

// simple ipc mocks for render and main process ipc using
// nodes' EventEmitter
const ipcMain: IIpcMain = {
    on: (event, cb) => {
        ipcEmitter.on(event, cb);
    },
    send: (event, args) => {
        const senderEvent = {
            sender: {
                send: (eventSend, arg) => {
                    ipcEmitter.emit(eventSend, arg);
                },
            },
        };
        ipcEmitter.emit(event, senderEvent, args);
    },
};

const powerMonitor: IPowerMonitor = {
    querySystemIdleTime: jest.fn().mockImplementation((cb) => cb(mockIdleTime)),
};

const ipcRenderer: IIpcRenderer = {
    sendSync: (event, args) => {
        const listeners = ipcEmitter.listeners(event);
        if (listeners.length > 0) {
            const listener = listeners[0];
            const eventArg = {};
            listener(eventArg, args);
            return eventArg;
        }
        return null;
    },
    send: (event, args) => {
        const senderEvent = {
            sender: {
                send: (eventSend, arg) => {
                    ipcEmitter.emit(eventSend, arg);
                },
            },
        };
        ipcEmitter.emit(event, senderEvent, args);
    },
    on: (eventName, cb) => {
        ipcEmitter.on(eventName, cb);
    },
    removeListener: (eventName, cb) => {
        ipcEmitter.removeListener(eventName, cb);
    },
};

export = {
    app,
    ipcMain,
    ipcRenderer,
    powerMonitor,
    require: jest.fn(),
    match: jest.fn(),
    remote: jest.fn(),
    dialog: jest.fn(),
};
