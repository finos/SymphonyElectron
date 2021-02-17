import { autoLaunchInstance } from '../src/app/auto-launch-controller';
import { config } from '../src/app/config-handler';
import { app } from './__mocks__/electron';

jest.mock('electron-log');

jest.mock('../src/app/config-handler', () => {
  return {
    CloudConfigDataTypes: {
      NOT_SET: 'NOT_SET',
      ENABLED: 'ENABLED',
      DISABLED: 'DISABLED',
    },
    config: {
      getGlobalConfigFields: jest.fn(() => ''),
      getConfigFields: jest.fn(() => {
        return {
          launchOnStartup: 'ENABLED',
        };
      }),
      updateUserConfig: jest.fn(),
    },
  };
});

describe('auto launch controller', async () => {
  beforeEach(() => {
    jest.spyOn(config, 'getConfigFields').mockImplementation(() => {
      return {
        launchOnStartup: 'ENABLED',
      };
    });
    jest.clearAllMocks();
  });

  it('should call `enableAutoLaunch` correctly', async () => {
    const spyFn = 'setLoginItemSettings';
    const spy = jest.spyOn(app, spyFn);
    await autoLaunchInstance.enableAutoLaunch();
    expect(spy).toBeCalled();
  });

  it('should call `disableAutoLaunch` correctly', async () => {
    const spyFn = 'setLoginItemSettings';
    const spy = jest.spyOn(app, spyFn);
    await autoLaunchInstance.disableAutoLaunch();
    expect(spy).toBeCalled();
  });

  it('should call `isAutoLaunchEnabled` correctly', async () => {
    const spyFn = 'getLoginItemSettings';
    const spy = jest.spyOn(app, spyFn);
    await autoLaunchInstance.isAutoLaunchEnabled();
    expect(spy).toBeCalled();
  });

  it('should enable AutoLaunch when `handleAutoLaunch` is called', async () => {
    const spyFn = 'enableAutoLaunch';
    const spy = jest.spyOn(autoLaunchInstance, spyFn);
    jest
      .spyOn(autoLaunchInstance, 'isAutoLaunchEnabled')
      .mockImplementation(() => false);
    await autoLaunchInstance.handleAutoLaunch();
    expect(spy).toBeCalled();
  });

  it('should disable AutoLaunch when `handleAutoLaunch` is called', async () => {
    jest.spyOn(config, 'getConfigFields').mockImplementation(() => {
      return {
        launchOnStartup: 'DISABLED',
      };
    });
    const spyFn = 'disableAutoLaunch';
    const spy = jest.spyOn(autoLaunchInstance, spyFn);
    jest
      .spyOn(autoLaunchInstance, 'isAutoLaunchEnabled')
      .mockImplementation(() => ({ openAtLogin: true }));
    await autoLaunchInstance.handleAutoLaunch();
    expect(spy).toBeCalled();
  });
});
