import * as fs from 'fs';
import * as path from 'path';
import { cleanUpAppCache, createAppCacheFile } from '../src/app/app-cache-handler';
import { app, session } from './__mocks__/electron';

jest.mock('fs', () => ({
        writeFileSync: jest.fn(),
        existsSync: jest.fn(() => true),
        unlinkSync: jest.fn(),
}));

jest.mock('../src/common/logger', () => {
    return {
        logger: {
            error: jest.fn(),
            info: jest.fn(),
        },
    };
});

describe('app cache handler', () => {
    const cachePathExpected = path.join(app.getPath('userData'), 'CacheCheck');

    it('should call `cleanUpAppCache` correctly', () => {
        const spyFn = 'unlinkSync';
        const spy = jest.spyOn(fs, spyFn);
        cleanUpAppCache();
        expect(spy).toBeCalledWith(cachePathExpected);
    });

    it('should call `clearCache` when `session.defaultSession` is not null', () => {
        jest.spyOn(fs, 'existsSync').mockImplementation(() => false);
        const spyFn = 'clearCache';
        const spy = jest.spyOn(session.defaultSession, spyFn);
        cleanUpAppCache();
        expect(spy).toBeCalled();
    });

    it('should call `createAppCacheFile` correctly', () => {
        const spyFn = 'writeFileSync';
        const spy = jest.spyOn(fs, spyFn);
        createAppCacheFile();
        expect(spy).lastCalledWith(cachePathExpected, '');
    });
});
