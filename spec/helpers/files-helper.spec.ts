import { FileHelper } from '../../src/app/helpers/file/files-helper';
import * as fs from 'fs';
import { IFile } from '../../src/app/interfaces/file-helper.interface';
import { LogCategory } from '../../src/app/interfaces/reports-handlers.interface';
import { isLinux, isMac } from '../../src/common/env';

describe('files-helper', () => {
  let fileHelper: FileHelper;
  let folderPath = 'C:\\abc';
  let fsMock;
  let logs = [
    'C9Zeus.2529612.log',
    'C9Zeus.1.log',
    'C9Trader.25296.log',
    'C9Trader.25.log',
    'HEHE.txt',
    'HAH.txt',
  ];
  beforeEach(() => {
    fileHelper = new FileHelper();
    fileHelper.createFiles();
    fsMock = jest.spyOn(fs, 'readdirSync').mockImplementation(() => logs);
  });

  afterEach(() => {
    fsMock.mockRestore();
  });

  it('should clean file names with proper format', () => {
    const validatedFileName = fileHelper.sanitizeFilename(
      'console.log("hello world").txt',
    );

    expect(validatedFileName).toBe('console.log__hello_world__.txt');
  });

  it('should clean file path', () => {
    const validatedPath = fileHelper.validateFilePath(
      'SELEC*FROM ABC/hello-world/haha',
    );

    expect(validatedPath).toBe(false);
  });

  it('should validate correct file path', () => {
    const validatedPath = fileHelper.validateFilePath('C:\\hello-world\\haha');

    expect(validatedPath).toBe(true);
  });

  it('should validate correct file name', () => {
    const validatedPath = fileHelper.validateFilename('ble-ble.txt ');
    const validatedPath2 = fileHelper.validateFilename('AUX.txt');
    const validatedPath3 = fileHelper.validateFilename('ble-ble.txt');

    expect(validatedPath).toBe(false);
    expect(validatedPath2).toBe(false);
    expect(validatedPath3).toBe(true);
  });

  it('should validate if valid log name', () => {
    const validatedLog = fileHelper.validateLogFileName(
      'sda_1747618623788.txt',
    );

    expect(validatedLog).toBe(true);
  });

  it('should return enough logs in folder - old modified', () => {
    const stats = {
      dev: 2114,
      ino: 48064969,
      mode: 33188,
      nlink: 1,
      uid: 85,
      gid: 100,
      rdev: 0,
      size: 527,
      blksize: 4096,
      blocks: 8,
      atimeMs: 1318289051000.1,
      mtimeMs: 1318289051000.1,
      ctimeMs: 1318289051000.1,
      birthtimeMs: 1318289051000.1,
      atime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      mtime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      ctime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      birthtime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      isFile: () => true,
    };
    const now = new Date();

    jest.spyOn(fs, 'statSync').mockImplementation((path) => {
      switch (path) {
        case `${folderPath}\\${logs[0]}`: {
          const newStats = { ...stats };
          newStats.mtime = new Date(now.getTime() - 360 * 60 * 1000);
          return newStats;
        }
        case `${folderPath}\\${logs[2]}`: {
          const newStats = { ...stats };
          newStats.mtime = new Date(now.getTime() - 380 * 60 * 1000);
          return stats;
        }
        default: {
          return stats;
        }
      }
    });
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const files = fileHelper.getLatestModifiedFiles(folderPath);
    const firstModifiedFile: IFile = {
      fileName: logs[0],
      platform: '',
      modifiedTimestamp: new Date(now.getTime() - 360 * 60 * 1000).getTime(),
    };

    if (isLinux || isMac) {
      expect(files?.get(LogCategory.RECENT)).toEqual(undefined);
    } else {
      expect(files?.get(LogCategory.RECENT)).toEqual(firstModifiedFile);
    }
  });

  it('should return enough logs in folder - mixed modified but get latest ones', () => {
    const stats = {
      dev: 2114,
      ino: 48064969,
      mode: 33188,
      nlink: 1,
      uid: 85,
      gid: 100,
      rdev: 0,
      size: 527,
      blksize: 4096,
      blocks: 8,
      atimeMs: 1318289051000.1,
      mtimeMs: 1318289051000.1,
      ctimeMs: 1318289051000.1,
      birthtimeMs: 1318289051000.1,
      atime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      mtime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      ctime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      birthtime: new Date('Mon, 10 Oct 2011 23:24:11 GMT'),
      isFile: () => true,
    };
    const now = new Date();

    jest.spyOn(fs, 'statSync').mockImplementation((path) => {
      switch (path) {
        case `${folderPath}\\${logs[0]}`: {
          const newStats = { ...stats };
          newStats.mtime = new Date(now.getTime() - 15 * 60 * 1000);
          return newStats;
        }
        case `${folderPath}\\${logs[2]}`: {
          const newStats = { ...stats };
          newStats.mtime = new Date(now.getTime() - 15 * 60 * 1000);
          return newStats;
        }
        case `${folderPath}\\${logs[3]}`: {
          const newStats = { ...stats };
          newStats.mtime = new Date(now.getTime() - 380 * 60 * 1000);
          return newStats;
        }
        default: {
          return stats;
        }
      }
    });

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const files = fileHelper.getLatestModifiedFiles(folderPath);
    const result = new Map<string, IFile>();
    const firstModifiedFile: IFile = {
      fileName: logs[0],
      platform: '',
      modifiedTimestamp: new Date(now.getTime() - 15 * 60 * 1000).getTime(),
    };
    const secondModifiedFile: IFile = {
      fileName: logs[2],
      platform: '',
      modifiedTimestamp: new Date(now.getTime() - 15 * 60 * 1000).getTime(),
    };

    result.set(LogCategory.LATEST + '_0', firstModifiedFile);
    result.set(LogCategory.LATEST + '_2', secondModifiedFile);

    if (isLinux || isMac) {
      expect(files?.get(LogCategory.LATEST + '_0')).toEqual(undefined);
      expect(files?.get(LogCategory.LATEST + '_2')).toEqual(undefined);
    } else {
      expect(files?.get(LogCategory.LATEST + '_0')).toEqual(firstModifiedFile);
      expect(files?.get(LogCategory.LATEST + '_2')).toEqual(secondModifiedFile);
    }
  });
});
