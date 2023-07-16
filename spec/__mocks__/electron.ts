import { EventEmitter } from 'events';
import * as path from 'path';
import { isWindowsOS } from '../../src/common/env';

const ipcEmitter = new EventEmitter();

const mockIdleTime: number = 15;
const appName: string = 'Symphony';
const executableName: string = '/Symphony.exe';
const isReady: boolean = true;
const version: string = '4.0.0';

process.on('unhandledRejection', (reason, promise) => {
  console.warn(
    'Unhandled promise rejection:',
    promise,
    'reason:',
    reason ? (reason as any).stack : 'unknown' || reason,
  );
});

interface IApp {
  commandLine: any;
  getAppPath(): string;
  getPath(type: string): string;
  getName(): string;
  isReady(): boolean;
  whenReady(): Promise<boolean>;
  getVersion(): string;
  on(eventName: any, cb: any): void;
  once(eventName: any, cb: any): void;
  setPath(value: string, path: string): void;
  setLoginItemSettings(settings: { openAtLogin: boolean; path: string }): void;
  getLoginItemSettings(options?: {
    path: string;
    args: string[];
  }): ILoginItemSettings;
  setAppLogsPath(): void;
}
interface ILoginItemSettings {
  openAtLogin: boolean;
}
interface IIpcMain {
  on(event: any, cb: any): void;
  handle(event: any, cb: any): Promise<void>;
  send(event: any, cb: any): void;
}
interface IIpcRenderer {
  sendSync(event: any, cb: any): any;
  on(eventName: any, cb: any): void;
  send(event: any, ...cb: any[]): void;
  removeListener(eventName: any, cb: any): void;
  once(eventName: any, cb: any): void;
}
interface IWebContents {
  setWindowOpenHandler(details: any): any;
  sendSync(event: any, cb: any): any;
  on(eventName: any, cb: any): void;
  send(event: any, ...cb: any[]): void;
  removeListener(eventName: any, cb: any): void;
  once(eventName: any, cb: any): void;
}
interface IPowerMonitor {
  getSystemIdleTime(): void;
  on(): void;
}

const pathToConfigDir = (): string => {
  if (isWindowsOS) {
    return path.join(__dirname, '/../..') as string;
  } else {
    return path.join(__dirname, '/..') as string;
  }
};

// electron app mock...
export const app: IApp = {
  getAppPath: pathToConfigDir,
  getPath: (type) => {
    if (type === 'exe') {
      return path.join(pathToConfigDir(), executableName);
    }
    if (type === 'userData') {
      return path.join(pathToConfigDir(), '/../config');
    }
    return pathToConfigDir();
  },
  getName: () => appName,
  isReady: () => isReady,
  whenReady: () => Promise.resolve(isReady),
  getVersion: () => version,
  on: (event, cb) => {
    ipcEmitter.on(event, cb);
  },
  setPath: () => jest.fn(),
  commandLine: {
    appendSwitch: jest.fn(),
  },
  once: (eventName, cb) => {
    ipcEmitter.on(eventName, cb);
  },
  setLoginItemSettings: () => jest.fn(),
  getLoginItemSettings: (): ILoginItemSettings => {
    return { openAtLogin: true };
  },
  setAppLogsPath: (): void => {
    return;
  },
};

// simple ipc mocks for render and main process ipc using
// nodes' EventEmitter
export const ipcMain: IIpcMain = {
  on: (event, cb) => {
    ipcEmitter.on(event, cb);
  },
  handle: (event, cb) => {
    ipcEmitter.on(event, cb);
    return Promise.resolve();
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

export const powerMonitor: IPowerMonitor = {
  getSystemIdleTime: jest.fn().mockReturnValue(mockIdleTime),
  on: jest.fn(),
};

export const ipcRenderer: IIpcRenderer = {
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
  send: (event, ...args) => {
    const senderEvent = {
      sender: {
        send: (eventSend, ...arg) => {
          ipcEmitter.emit(eventSend, ...arg);
        },
      },
      preventDefault: jest.fn(),
    };
    ipcEmitter.emit(event, senderEvent, ...args);
  },
  on: (eventName, cb) => {
    ipcEmitter.on(eventName, cb);
  },
  removeListener: (eventName, cb) => {
    ipcEmitter.removeListener(eventName, cb);
  },
  once: (eventName, cb) => {
    ipcEmitter.on(eventName, cb);
  },
};

export const webContents: IWebContents = {
  setWindowOpenHandler: (_details: {}) => {
    return { action: 'allow' };
  },
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
  send: (event, ...args) => {
    const senderEvent = {
      sender: {
        send: (eventSend, ...arg) => {
          ipcEmitter.emit(eventSend, ...arg);
        },
      },
      preventDefault: jest.fn(),
    };
    ipcEmitter.emit(event, senderEvent, ...args);
  },
  on: (eventName, cb) => {
    ipcEmitter.on(eventName, cb);
  },
  removeListener: (eventName, cb) => {
    ipcEmitter.removeListener(eventName, cb);
  },
  once: (eventName, cb) => {
    ipcEmitter.on(eventName, cb);
  },
};

export const shell = {
  openExternal: jest.fn(),
};

// tslint:disable-next-line:variable-name
export const Menu = {
  buildFromTemplate: jest.fn(),
  setApplicationMenu: jest.fn(),
};

export const crashReporter = {
  start: jest.fn(),
  getLastCrashReport: jest.fn(),
};

const getCurrentWindow = jest.fn(() => {
  return {
    isFullScreen: jest.fn(() => {
      return false;
    }),
    isMaximized: jest.fn(() => {
      return false;
    }),
    on: jest.fn(),
    removeListener: jest.fn(),
    isDestroyed: jest.fn(() => {
      return false;
    }),
    close: jest.fn(),
    maximize: jest.fn(),
    minimize: jest.fn(),
    unmaximize: jest.fn(),
    setFullScreen: jest.fn(),
  };
});

const clipboard = {
  write: jest.fn(),
  readTest: jest.fn(() => {
    return '';
  }),
};

export const dialog = {
  showMessageBox: jest.fn(),
  showErrorBox: jest.fn(),
};

// tslint:disable-next-line:variable-name
export const BrowserWindow = {
  getFocusedWindow: jest.fn(() => {
    return {
      isDestroyed: jest.fn(() => false),
    };
  }),
  fromWebContents: (arg) => arg,
  getAllWindows: jest.fn(() => []),
};

export const session = {
  defaultSession: {
    clearCache: jest.fn(),
    cookies: jest.fn(),
  },
};

export const screen = {
  getAllDisplays: jest.fn(),
  getPrimaryDisplay: jest.fn(() => {
    return {
      workArea: {
        x: '',
        y: '',
      },
      workAreaSize: {
        width: '',
        height: '',
      },
    };
  }),
};

export const remote = {
  app,
  getCurrentWindow,
  clipboard,
};
