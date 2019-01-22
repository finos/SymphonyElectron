import { ILogMsg } from '../src/common/logger';

describe('logger', () => {
    let instance;
    beforeEach(() => {
        // I did it for reset module imported between tests
        const { logger } = require('../src/common/logger');
        instance = logger;
        jest.resetModules();
    });

    it('when no logger registered then queue items', () => {
        instance.debug('test');
        instance.debug('test2');
        const queue: ILogMsg[] = instance.getLogQueue();
        expect(queue.length).toBe(2);
    });

    it('should call send when logger get registered', () => {
        instance.debug('test');
        instance.debug('test2');

        const mock = jest.fn<Electron.WebContents>(() => ({
            send: jest.fn(),
        }));
        const mockWin = new mock();
        instance.setLoggerWindow(mockWin);
        expect(mockWin.send).toHaveBeenCalled();
    });

    it('should call `logger.error` correctly', () => {
        const spy = jest.spyOn(instance, 'log');

        instance.error('test error', { error: 'test error' });

        expect(spy).toBeCalledWith('error', 'test error', [{ error: 'test error' }]);
    });

    it('should call `logger.warn` correctly', () => {
        const spy = jest.spyOn(instance, 'log');

        instance.warn('test warn', { warn: 'test warn' });

        expect(spy).toBeCalledWith('warn', 'test warn', [{ warn: 'test warn' }]);
    });

    it('should call `logger.debug` correctly', () => {
        const spy = jest.spyOn(instance, 'log');

        instance.debug('test debug', { debug: 'test debug' });

        expect(spy).toBeCalledWith('debug', 'test debug', [{ debug: 'test debug' }]);
    });

    it('should call `logger.info` correctly', () => {
        const spy = jest.spyOn(instance, 'log');

        instance.info('test info', { info: 'test info' });

        expect(spy).toBeCalledWith('info', 'test info', [{ info: 'test info' }]);
    });

    it('should call `logger.verbose` correctly', () => {
        const spy = jest.spyOn(instance, 'log');

        instance.verbose('test verbose', { verbose: 'test verbose' });

        expect(spy).toBeCalledWith('verbose', 'test verbose', [{ verbose: 'test verbose' }]);
    });

    it('should call `logger.silly` correctly', () => {
        const spy = jest.spyOn(instance, 'log');

        instance.silly('test silly', { silly: 'test silly' });

        expect(spy).toBeCalledWith('silly', 'test silly', [{ silly: 'test silly' }]);
    });

    it('should call `logger.sendToCloud` when `logger.debug` is called', () => {
        const spyLog = jest.spyOn(instance, 'log');
        const spySendToCloud = jest.spyOn(instance, 'sendToCloud');
        instance.debug('test');

        expect(spyLog).toBeCalled();
        expect(spySendToCloud).toBeCalled();

    });

    it('should cap at 100 queued log messages', () => {
        for (let i = 0; i < 110; i++) {
            instance.debug('test' + i);
        }
        const queue = instance.getLogQueue();
        expect(queue.length).toBe(100);
    });

});
