import { autoLaunchInstance } from '../src/app/auto-launch-controller';
import { config } from '../src/app/config-handler';
import * as electron from './__mocks__/electron';

jest.mock('electron-log');

jest.mock('../src/app/config-handler', () => {
    return {
        config: {
            getGlobalConfigFields: jest.fn(() => ''),
            getConfigFields: jest.fn(() => {
                return {
                    launchOnStartup: true,
                };
            }),
        },
    };
});

describe('auto launch controller', async () => {

    beforeEach(() => {
        jest.spyOn(config, 'getConfigFields').mockImplementation(() => {
            return {
                launchOnStartup: true,
            };
        });
        jest.clearAllMocks();
    });

    it('should call `enableAutoLaunch` correctly', async () => {
        const spyFn = 'enable';
        const spy = jest.spyOn(autoLaunchInstance, spyFn);
        await autoLaunchInstance.enableAutoLaunch();
        expect(spy).toBeCalled();
    });

    it('should call `disableAutoLaunch` correctly', async () => {
        const spyFn = 'disable';
        const spy = jest.spyOn(autoLaunchInstance, spyFn);
        await autoLaunchInstance.disableAutoLaunch();
        expect(spy).toBeCalled();
    });

    it('should call `isAutoLaunchEnabled` correctly', async () => {
        const spyFn = 'isEnabled';
        const spy = jest.spyOn(autoLaunchInstance, spyFn);
        await autoLaunchInstance.isAutoLaunchEnabled();
        expect(spy).toBeCalled();
    });

    it('should fail `enableAutoLaunch` when catch is trigged', async () => {
        const spyFn = 'showMessageBox';
        const spy = jest.spyOn(electron.dialog, spyFn);
        autoLaunchInstance.enable = jest.fn(() => Promise.reject());
        await autoLaunchInstance.enableAutoLaunch();
        expect(spy).toBeCalled();
    });

    it('should fail `disableAutoLaunch` when catch is trigged', async () => {
        const spyFn = 'showMessageBox';
        const spy = jest.spyOn(electron.dialog, spyFn);
        autoLaunchInstance.disable = jest.fn(() => Promise.reject());
        await autoLaunchInstance.disableAutoLaunch();
        expect(spy).toBeCalled();
    });

    it('should enable AutoLaunch when `handleAutoLaunch` is called', async () => {
        const spyFn = 'enableAutoLaunch';
        const spy = jest.spyOn(autoLaunchInstance, spyFn);
        jest.spyOn(autoLaunchInstance,'isAutoLaunchEnabled').mockImplementation(() => false);
        await autoLaunchInstance.handleAutoLaunch();
        expect(spy).toBeCalled();
    });

    it('should disable AutoLaunch when `handleAutoLaunch` is called', async () => {
        jest.spyOn(config, 'getConfigFields').mockImplementation(() => {
            return {
                launchOnStartup: false,
            };
        });
        const spyFn = 'disableAutoLaunch';
        const spy = jest.spyOn(autoLaunchInstance, spyFn);
        jest.spyOn(autoLaunchInstance,'isAutoLaunchEnabled').mockImplementation(() => true);
        await autoLaunchInstance.handleAutoLaunch();
        expect(spy).toBeCalled();
    });
});
