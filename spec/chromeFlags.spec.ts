import { setChromeFlags } from '../src/app/chrome-flags';
import { config } from '../src/app/config-handler';
import { isDevEnv, isMac, isWindowsOS } from '../src/common/env';
import { getCommandLineArgs } from '../src/common/utils';
import { app } from './__mocks__/electron';

jest.mock('../src/common/utils', () => {
    return {
        config: {
            getGlobalConfigFields: jest.fn(() => {
                return {
                    customFlags: {
                        authServerWhitelist: 'url',
                        authNegotiateDelegateWhitelist: 'whitelist',
                        disableGpu: true,
                    },
                };
            }),
        },
    };
});

jest.mock('../src/common/utils', () => {
    return {
        getCommandLineArgs: jest.fn(() => '--chrome-flags=remote-debugging-port:5858,host-rules:MAP * 127.0.0.1'),
        compareVersions: jest.fn(),
    };
});

jest.mock('electron-log');

describe('chrome flags', () => {
    beforeEach(() => {
        (isDevEnv as any) = false;
        (isMac as any) = true;
        (isWindowsOS as any) = false;
        (getCommandLineArgs as any) = jest.fn(() => '--chrome-flags=remote-debugging-port:5858,host-rules:MAP * 127.0.0.1');
        config.getGlobalConfigFields = jest.fn(() => {
                return {
                    customFlags: {
                        authServerWhitelist: 'url',
                        authNegotiateDelegateWhitelist: 'whitelist',
                        disableGpu: true,
                    },
                };
            });
        jest.clearAllMocks();
    });

    it('should call `setChromeFlags` correctly', () => {
        const spy = jest.spyOn(app.commandLine, 'appendSwitch');
        setChromeFlags();
        expect(spy).nthCalledWith(1, 'auth-negotiate-delegate-whitelist', 'url');
        expect(spy).nthCalledWith(2, 'auth-server-whitelist', 'whitelist');
        expect(spy).nthCalledWith(3, 'disable-background-timer-throttling', 'true');
        expect(spy).nthCalledWith(4, 'disable-d3d11', true);
        expect(spy).nthCalledWith(5, 'disable-gpu', true);
        expect(spy).nthCalledWith(6, 'disable-gpu-compositing', true);
    });

    it('should call `setChromeFlags` correctly when `disableGpu` is false', () => {
        config.getGlobalConfigFields = jest.fn(() => {
            return {
                customFlags: {
                    authServerWhitelist: 'url',
                    authNegotiateDelegateWhitelist: 'whitelist',
                },
            };
        });
        const spy = jest.spyOn(app.commandLine, 'appendSwitch');
        setChromeFlags();
        expect(spy).nthCalledWith(1, 'auth-negotiate-delegate-whitelist', 'url');
        expect(spy).nthCalledWith(2, 'auth-server-whitelist', 'whitelist');
        expect(spy).nthCalledWith(3, 'disable-background-timer-throttling', 'true');
        expect(spy).not.nthCalledWith(4);
    });

    describe('`isDevEnv`', () => {
        beforeEach(() => {
            (isDevEnv as any) = true;
        });

        it('should call `setChromeFlags` correctly', () => {
            const spy = jest.spyOn(app.commandLine, 'appendSwitch');
            setChromeFlags();
            expect(spy).nthCalledWith(1, 'auth-negotiate-delegate-whitelist', 'url');
            expect(spy).nthCalledWith(2, 'auth-server-whitelist', 'whitelist');
            expect(spy).nthCalledWith(3, 'disable-background-timer-throttling', 'true');
            expect(spy).nthCalledWith(4, 'disable-d3d11', true);
            expect(spy).nthCalledWith(5, 'disable-gpu', true);
            expect(spy).nthCalledWith(6, 'disable-gpu-compositing', true);
            expect(spy).nthCalledWith(7, 'remote-debugging-port', '5858');
            expect(spy).nthCalledWith(8, 'host-rules', 'MAP * 127.0.0.1');
        });

        it('should return `undefined` when `chromeFlagsFromCmd` is null', () => {
            (getCommandLineArgs as any) = jest.fn(() => null);
            expect(setChromeFlags()).toBeUndefined();
        });

        it('should return `undefined` when  `chromeFlagsArgs` is incorrect', () => {
            (getCommandLineArgs as any) = jest.fn(() => 'testing');
            expect(setChromeFlags()).toBeUndefined();
        });

        it('should return `undefined` when  `flags[key]` is incorrect', () => {
            (getCommandLineArgs as any) = jest.fn(() => '--chrome-flags=,');
            expect(setChromeFlags()).toBeUndefined();
        });
    });
});
