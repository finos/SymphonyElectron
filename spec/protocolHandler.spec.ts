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

jest.mock('../src/common/env', () => {
    return {
        isWindowsOS: false,
    };
});

describe('protocol handler', () => {
    let protocolHandlerInstance;

    beforeEach(() => {
        jest.resetModules();
        const { protocolHandler } = require('../src/app/protocol-handler');
        protocolHandlerInstance = protocolHandler;
    });

    it('protocol uri should be null by default', () => {
        expect(protocolHandlerInstance.protocolUri).toBeNull();
    });

    it('protocol action should be called when uri is correct', () => {
        protocolHandlerInstance.preloadWebContents = { send: jest.fn() };

        const spy: jest.SpyInstance = jest.spyOn(protocolHandlerInstance.preloadWebContents, 'send');
        const uri: string = 'symphony://?userId=123456';
        const protocolAction: string = 'protocol-action';

        protocolHandlerInstance.sendProtocol(uri);

        expect(spy).toBeCalledWith(protocolAction, 'symphony://?userId=123456');
    });

    it('protocol action not should be called when uri is incorrect', () => {
        protocolHandlerInstance.preloadWebContents = { send: jest.fn() };

        const spy: jest.SpyInstance = jest.spyOn(protocolHandlerInstance.preloadWebContents, 'send');
        const uri: string = 'symphony---://?userId=123456';
        const protocolAction: string = 'protocol-action';

        protocolHandlerInstance.sendProtocol(uri);

        expect(spy).not.toBeCalledWith(protocolAction, 'symphony://?userId=123456');
    });

    it('protocol should get uri from `processArgv` when `getCommandLineArgs` is called', () => {
        const { getCommandLineArgs } = require('../src/common/utils');

        protocolHandlerInstance.processArgv('');

        expect(getCommandLineArgs).toBeCalled();
    });

    it('should be called `sendProtocol` when is windowsOS on `processArgs`', () => {
        const env = require('../src/common/env');
        env.isWindowsOS = true;

        const spy: jest.SpyInstance = jest.spyOn(protocolHandlerInstance, 'sendProtocol');

        protocolHandlerInstance.processArgv('');

        expect(spy).toBeCalled();
    });

    it('should invoke `sendProtocol` when `setPreloadWebContents` is called and protocolUri is valid', () => {
        protocolHandlerInstance.preloadWebContents = { send: jest.fn() };
        protocolHandlerInstance.protocolUri = 'symphony://?userId=123456';

        const spy: jest.SpyInstance = jest.spyOn(protocolHandlerInstance, 'sendProtocol');

        protocolHandlerInstance.setPreloadWebContents({ send: jest.fn() });
        expect(spy).toBeCalledWith('symphony://?userId=123456');
    });

    it('should not invoke `sendProtocol` when `setPreloadWebContents` is called and protocolUri is invalid', () => {
        protocolHandlerInstance.preloadWebContents = { send: jest.fn() };
        protocolHandlerInstance.protocolUri = null;

        const spy: jest.SpyInstance = jest.spyOn(protocolHandlerInstance, 'sendProtocol');

        protocolHandlerInstance.setPreloadWebContents({ send: jest.fn() });
        expect(spy).not.toBeCalled();
    });

});
