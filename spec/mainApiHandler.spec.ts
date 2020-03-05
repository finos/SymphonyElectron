import { activityDetection } from '../src/app/activity-detection';
import '../src/app/main-api-handler';
import { protocolHandler } from '../src/app/protocol-handler';
import { screenSnippet } from '../src/app/screen-snippet-handler';
import * as windowActions from '../src/app/window-actions';
import { windowHandler } from '../src/app/window-handler';
import * as utils from '../src/app/window-utils';
import { apiCmds, apiName } from '../src/common/api-interface';
import { logger } from '../src/common/logger';
import { BrowserWindow, ipcMain } from './__mocks__/electron';

jest.mock('electron-log');

jest.mock('../src/app/protocol-handler', () => {
    return {
        protocolHandler: {
            setPreloadWebContents: jest.fn(),
        },
    };
});

jest.mock('../src/app/screen-snippet-handler', () => {
    return {
        screenSnippet: {
            capture: jest.fn(),
        },
    };
});

jest.mock('../src/app/window-actions', () => {
    return {
        activate: jest.fn(),
        handleKeyPress: jest.fn(),
    };
});

jest.mock('../src/app/window-handler', () => {
    return {
        windowHandler: {
            closeWindow: jest.fn(),
            createNotificationSettingsWindow: jest.fn(),
            createScreenPickerWindow: jest.fn(),
            createScreenSharingIndicatorWindow: jest.fn(),
            isOnline: false,
            updateVersionInfo: jest.fn(),
        },
    };
});

jest.mock('../src/app/window-utils', () => {
    return {
        downloadManagerAction: jest.fn(),
        isValidWindow: jest.fn(() => true),
        sanitize: jest.fn(),
        setDataUrl: jest.fn(),
        showBadgeCount: jest.fn(),
        showPopupMenu: jest.fn(),
        updateLocale: jest.fn(),
        windowExists: jest.fn( () => true),
    };
});

jest.mock('../src/common/logger', () => {
    return {
        logger: {
            setLoggerWindow: jest.fn(),
            error: jest.fn(),
        },
    };
});

jest.mock('../src/app/config-handler', () => {
    return {
        CloudConfigDataTypes: {
            NOT_SET: 'NOT_SET',
            ENABLED: 'ENABLED',
            DISABLED: 'DISABLED',
        },
        config: {
            getConfigFields: jest.fn(() => {
                return {
                    bringToFront: 'ENABLED',
                };
            }),
        },
    };
});

jest.mock('../src/app/activity-detection', () => {
    return {
        activityDetection: {
            setWindowAndThreshold: jest.fn(),
        },
    };
});

jest.mock('../src/common/i18n');

describe('main api handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        (utils.isValidWindow as any) = jest.fn(() => true);
    });

    describe('symphony-api events', () => {

        it('should call `isOnline` correctly', () => {
            const value = {
                cmd: apiCmds.isOnline,
                isOnline: true,
            };
            ipcMain.send(apiName.symphonyApi, value);
            expect(windowHandler.isOnline).toBe(true);
        });

        it('should call `setBadgeCount` correctly', () => {
            const spy = jest.spyOn(utils, 'showBadgeCount');
            const value = {
                cmd: apiCmds.setBadgeCount,
                count: 3,
            };
            const expectedValue = 3;
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should fail when `isValidWindow` is false', () => {
            (utils.isValidWindow as any) = jest.fn(() => false);
            const spy = jest.spyOn(utils, 'showBadgeCount');
            const value = {
                cmd: apiCmds.setBadgeCount,
                count: 3,
            };
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).not.toBeCalled();
        });

        it('should fail when `arg` is false', () => {
            const value = null;
            const spy = jest.spyOn(utils, 'showBadgeCount');
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).not.toBeCalled();
        });

        it('should call `registerProtocolHandler` correctly', () => {
            const spy = jest.spyOn(protocolHandler, 'setPreloadWebContents');
            const value = {
                cmd: apiCmds.registerProtocolHandler,
            };
            const expectedValue = {
                send: expect.any(Function),
            };
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `badgeDataUrl` correctly', () => {
            const spy = jest.spyOn(utils, 'setDataUrl');
            const value = {
                cmd: apiCmds.badgeDataUrl,
                dataUrl: 'https://symphony.com',
                count: 3,
            };
            const expectedValue = [ 'https://symphony.com', 3 ];
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(...expectedValue);
        });

        it('should call `activate` correctly', () => {
            const spy = jest.spyOn(windowActions, 'activate');
            const value = {
                cmd: apiCmds.activate,
                windowName: 'notification',
            };
            const expectedValue = 'notification';
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `registerLogger` correctly', () => {
            const spy = jest.spyOn(logger, 'setLoggerWindow');
            const value = {
                cmd: apiCmds.registerLogger,
            };
            const expectedValue = {
                send: expect.any(Function),
            };
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `registerActivityDetection` correctly', () => {
            const spy = jest.spyOn(activityDetection, 'setWindowAndThreshold');
            const value = {
                cmd: apiCmds.registerActivityDetection,
                period: 3,
            };
            const expectedValue = [ { send: expect.any(Function) }, 3 ];
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(...expectedValue);
        });

        it('should call `showNotificationSettings` correctly', () => {
            const spy = jest.spyOn(windowHandler, 'createNotificationSettingsWindow');
            const value = {
                cmd: apiCmds.showNotificationSettings,
                windowName: 'notification-settings',
            };
            const expectedValue = 'notification-settings';
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `sanitize` correctly', () => {
            const spy = jest.spyOn(utils, 'sanitize');
            const value = {
                cmd: apiCmds.sanitize,
                windowName: 'main',
            };
            const expectedValue = 'main';
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `bringToFront` correctly', () => {
            const spy = jest.spyOn(windowActions, 'activate');
            const value = {
                cmd: apiCmds.bringToFront,
                reason: 'notification',
                windowName: 'notification',
            };
            const expectedValue = [ 'notification', false ];
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(...expectedValue);
        });

        it('should call `openScreenPickerWindow` correctly', () => {
            const spy = jest.spyOn(windowHandler, 'createScreenPickerWindow');
            const value = {
                cmd: apiCmds.openScreenPickerWindow,
                sources: [],
                id: 3,
            };
            const expectedValue = [ {send: expect.any(Function)}, [], 3 ];
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(...expectedValue);
        });

        it('should call `popupMenu` correctly', () => {
            const fromWebContentsMocked = {
                isDestroyed: jest.fn(),
                winName: apiName.mainWindowName,
            };
            const spy = jest.spyOn(utils, 'showPopupMenu');
            const value = {
                cmd: apiCmds.popupMenu,
            };
            const expectedValue = { window: fromWebContentsMocked };
            jest.spyOn(BrowserWindow, 'fromWebContents').mockImplementation(() => {
                return fromWebContentsMocked;
            });
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `setLocale` correctly', () => {
            const spy = jest.spyOn(utils, 'updateLocale');
            const value = {
                cmd: apiCmds.setLocale,
                locale: 'en-US',
            };
            const expectedValue = 'en-US';
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `keyPress` correctly', () => {
            const spy = jest.spyOn(windowActions, 'handleKeyPress');
            const value = {
                cmd: apiCmds.keyPress,
                keyCode: 3,
            };
            const expectedValue = 3;
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `openScreenSnippet` correctly', () => {
            const spy = jest.spyOn(screenSnippet, 'capture');
            const value = {
                cmd: apiCmds.openScreenSnippet,
            };
            const expectedValue = { send: expect.any(Function) };
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(expectedValue);
        });

        it('should call `closeWindow` correctly', () => {
            const spy = jest.spyOn(windowHandler, 'closeWindow');
            const value = {
                cmd: apiCmds.closeWindow,
                windowType: 2,
                winKey: 'main',
            };
            const expectedValue = [ 2, 'main' ];
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(...expectedValue);
        });

        it('should call `openScreenSharingIndicator` correctly', () => {
            const spy = jest.spyOn(windowHandler, 'createScreenSharingIndicatorWindow');
            const value = {
                cmd: apiCmds.openScreenSharingIndicator,
                displayId: 'main',
                id: 3,
                streamId: '3',
            };
            const expectedValue = [ { send: expect.any(Function) }, 'main', 3, '3' ];
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(...expectedValue);
        });

        it('should call `downloadManagerAction` correctly', () => {
            const spy = jest.spyOn(utils, 'downloadManagerAction');
            const value = {
                cmd: apiCmds.downloadManagerAction,
                type: 2,
                path: '/Users/symphony/SymphonyElectron/src/app/main-api-handler.ts',
            };
            const expectedValue = [ 2, '/Users/symphony/SymphonyElectron/src/app/main-api-handler.ts' ];
            ipcMain.send(apiName.symphonyApi, value);
            expect(spy).toBeCalledWith(...expectedValue);
        });
    });
});
