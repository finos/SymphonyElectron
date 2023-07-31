import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import {
  cleanAppCacheOnInstall,
  cleanUpAppCache,
  createAppCacheFile,
} from '../src/app/app-cache-handler';
import { app, session } from './__mocks__/electron';

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(() => [
    'Cache',
    'GPUCache',
    'Symphony.config',
    'cloudConfig.config',
  ]),
  lstatSync: jest.fn(() => {
    return {
      isDirectory: jest.fn(() => true),
    };
  }),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

jest.mock('rimraf', () => ({
  sync: jest.fn(),
}));

jest.mock('../src/common/logger', () => {
  return {
    logger: {
      error: jest.fn(),
      info: jest.fn(),
    },
  };
});

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      createMoreInfoWindow: jest.fn(),
      getMainWindow: jest.fn(),
      isMana: true,
    },
  };
});

describe('app cache handler', () => {
  describe('check app cache file', () => {
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

  describe('clean app cache on install', () => {
    it('should clean app cache and cookies on install', () => {
      const pathSpy = jest.spyOn(path, 'join');

      const fsReadDirSpy = jest.spyOn(fs, 'readdirSync');
      const fsStatSpy = jest.spyOn(fs, 'lstatSync');
      const fsUnlinkSpy = jest.spyOn(fs, 'unlinkSync');

      const rimrafSpy = jest.spyOn(rimraf, 'sync');

      cleanAppCacheOnInstall();

      expect(pathSpy).toBeCalled();

      expect(fsReadDirSpy).toBeCalled();
      expect(fsStatSpy).toBeCalled();
      expect(fsUnlinkSpy).toBeCalled();

      expect(rimrafSpy).toBeCalled();
    });
  });
});
