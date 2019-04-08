import { handleChildWindow } from '../src/app/child-window-handler';
import { config } from '../src/app/config-handler';
import { windowHandler } from '../src/app/window-handler';
import { injectStyles } from '../src/app/window-utils';
import { ipcRenderer } from './__mocks__/electron';

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
};

jest.mock('../src/common/env', () => {
    return {
        isWindowsOS: true,
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

describe('child window handle', () => {
    const frameName = { };
    const disposition = 'new-window';
    const newWinOptions = {
        webPreferences: jest.fn(),
        webContents: { ...ipcRenderer, ...getMainWindow, webContents: ipcRenderer},
    };

    it('should call `did-start-loading` correctly on WindowOS', () => {
        const newWinUrl = 'about:blank';
        const args = [newWinUrl, frameName, disposition, newWinOptions];
        const spy = jest.spyOn(getMainWindow, 'setMenuBarVisibility');
        handleChildWindow(ipcRenderer as any);
        ipcRenderer.send('new-window', ...args);
        ipcRenderer.send('did-start-loading');
        expect(spy).toBeCalledWith(false);
    });

    it('should call `did-finish-load` correctly on WindowOS', () => {
        config.getGlobalConfigFields = jest.fn(() => {
            return {
                url: 'https://foundation-dev.symphony.com',
            };
        });
        const newWinUrl = 'about:blank';
        const args = [newWinUrl, frameName, disposition, newWinOptions];
        const spy = jest.spyOn(newWinOptions.webContents.webContents, 'send');
        handleChildWindow(ipcRenderer as any);
        ipcRenderer.send('new-window', ...args);
        ipcRenderer.send('did-finish-load');
        expect(spy).lastCalledWith('page-load',  {
            enableCustomTitleBar: false,
            isMainWindow: false,
            isWindowsOS: true,
            locale: 'en-US',
            origin: 'https://foundation-dev.symphony.com',
            resources: {},
        });
        expect(injectStyles).toBeCalled();
    });

    it('should call `windowHandler.openUrlInDefaultBrowser` when url in invalid', () => {
        const newWinUrl = 'invalid';
        const args = [newWinUrl, frameName, disposition, newWinOptions];
        const spy = jest.spyOn(windowHandler, 'openUrlInDefaultBrowser');
        handleChildWindow(ipcRenderer as any);
        ipcRenderer.send('new-window', ...args);
        expect(spy).toBeCalledWith('invalid');
    });
});
