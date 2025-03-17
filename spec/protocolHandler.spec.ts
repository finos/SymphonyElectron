import { activate } from '../src/app/window-actions';
import { protocolHandler } from '../src/app/protocol-handler';
import { getCommandLineArgs } from '../src/common/utils';
import * as env from '../src/common/env';

jest.mock('electron-log');

jest.mock('../src/app/window-actions', () => {
  return {
    activate: jest.fn(),
  };
});

jest.mock('../src/common/utils', () => {
  return {
    getCommandLineArgs: jest.fn(() => 'symphony://?userId=22222'),
  };
});

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      url: '',
    },
  };
});

jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: false,
    isLinux: false,
    isMac: true,
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

jest.mock('../src/app/config-handler', () => {
  return {
    config: {
      getUserConfigFields: jest.fn(() => ''),
    },
  };
});

const mockEnv = env as {
  isWindowsOS: boolean;
  isLinux: boolean;
  isMac: boolean;
};

describe('protocol handler', () => {
  let protocolHandlerInstance;

  beforeEach(async () => {
    jest.resetModules();
    jest.resetAllMocks();
    protocolHandlerInstance = protocolHandler;
  });

  it('protocol uri should be null by default', () => {
    expect(protocolHandlerInstance.protocolUri).toBe(
      'symphony://?userId=22222',
    );
  });

  it('protocol action should be called when uri is correct', () => {
    protocolHandlerInstance.preloadWebContents = { send: jest.fn() };

    const spy: jest.SpyInstance = jest.spyOn(
      protocolHandlerInstance.preloadWebContents,
      'send',
    );
    const uri: string = 'symphony://?userId=123456';
    const protocolAction: string = 'protocol-action';

    protocolHandlerInstance.sendProtocol(uri);

    expect(spy).toBeCalledWith(protocolAction, 'symphony://?userId=123456');
  });

  it('protocol activate should be called when uri is correct on macOS', () => {
    protocolHandlerInstance.preloadWebContents = { send: jest.fn() };
    const uri: string = 'symphony://?userId=123456';

    protocolHandlerInstance.sendProtocol(uri);

    expect(activate).toBeCalledWith('main');
  });

  it('protocol activate should not be called when uri is correct on non macOS', () => {
    mockEnv.isMac = false;

    protocolHandlerInstance.preloadWebContents = { send: jest.fn() };
    const uri: string = 'symphony://?userId=123456';

    protocolHandlerInstance.sendProtocol(uri);

    expect(activate).not.toBeCalled();
  });

  it('protocol action not should be called when uri is incorrect', () => {
    protocolHandlerInstance.preloadWebContents = { send: jest.fn() };

    const spy: jest.SpyInstance = jest.spyOn(
      protocolHandlerInstance.preloadWebContents,
      'send',
    );
    const uri: string = 'symphony---://?userId=123456';
    const protocolAction: string = 'protocol-action';

    protocolHandlerInstance.sendProtocol(uri);

    expect(spy).not.toBeCalledWith(protocolAction, 'symphony://?userId=123456');
  });

  it('protocol should get uri from `processArgv` when `getCommandLineArgs` is called', () => {
    protocolHandlerInstance.processArgv('');

    expect(getCommandLineArgs).toBeCalled();
  });

  it('should invoke `sendProtocol` when `setPreloadWebContents` is called and protocolUri is valid', () => {
    protocolHandlerInstance.preloadWebContents = { send: jest.fn() };
    protocolHandlerInstance.protocolUri = 'symphony://?userId=123456';

    const spy: jest.SpyInstance = jest.spyOn(
      protocolHandlerInstance,
      'sendProtocol',
    );

    protocolHandlerInstance.setPreloadWebContents({ send: jest.fn() });
    expect(spy).toBeCalledWith('symphony://?userId=123456');
  });

  it('should not invoke `sendProtocol` when `setPreloadWebContents` is called and protocolUri is invalid', () => {
    protocolHandlerInstance.preloadWebContents = { send: jest.fn() };
    protocolHandlerInstance.protocolUri = null;

    const spy: jest.SpyInstance = jest.spyOn(
      protocolHandlerInstance,
      'sendProtocol',
    );

    protocolHandlerInstance.setPreloadWebContents({ send: jest.fn() });
    expect(spy).not.toBeCalled();
  });
});
