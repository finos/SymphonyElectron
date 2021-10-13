import { handleChildWindow } from '../src/app/child-window-handler';
import { webContents } from './__mocks__/electron';
import anything = jasmine.anything;

const getMainWindow = {
  isDestroyed: jest.fn(() => false),
  getBounds: jest.fn(() => {
    return {
      x: 11,
      y: 22,
    };
  }),
  isAlwaysOnTop: jest.fn(() => true),
  setMenuBarVisibility: jest.fn(),
  setAlwaysOnTop: jest.fn(),
  setFullScreenable: jest.fn(),
};

jest.mock('electron-log');

jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: true,
    isLinux: false,
    isMac: false,
  };
});

jest.mock('../src/app/window-utils', () => {
  return {
    injectStyles: jest.fn(),
    preventWindowNavigation: jest.fn(),
  };
});

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      url: 'https://test.symphony.com',
      getMainWindow: jest.fn(() => {
        return getMainWindow;
      }),
      openUrlInDefaultBrowser: jest.fn(),
      addWindow: jest.fn(),
    },
  };
});

jest.mock('../src/app/window-actions', () => {
  return {
    monitorWindowActions: jest.fn(),
  };
});

jest.mock('../src/common/logger', () => {
  return {
    logger: {
      setLoggerWindow: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      verbose: jest.fn(),
      debug: jest.fn(),
      silly: jest.fn(),
    },
  };
});

describe('child window handle', () => {
  it('should set open window handler', () => {
    const spy = jest.spyOn(webContents, 'setWindowOpenHandler');

    handleChildWindow(webContents as any);
    expect(spy).toBeCalledWith(expect.any(Function));
  });

  it('should trigger did-create-window', () => {
    const spy = jest.spyOn(webContents, 'on');
    handleChildWindow(webContents as any);
    expect(spy).toBeCalledWith('did-create-window', anything());
  });
});
