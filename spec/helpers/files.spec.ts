import * as fs from 'fs';
import { Files } from '../../src/app/helpers/file/files';
import {
  LogCategory,
  Platform,
} from '../../src/app/interfaces/reports-handlers.interface';
import { IFile } from '../../src/app/interfaces/file.interface';
import { isLinux, isMac } from '../../src/common/env';

describe('files', () => {
  let file = new Files();
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
    fsMock = jest.spyOn(fs, 'readdirSync').mockImplementation(() => logs);
  });

  afterEach(() => {
    fsMock.mockRestore();
  });

  it('should return enough files in folder', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const files = file.retrieveFilesInFolders(folderPath, {
      includeOnly: [
        LogCategory.C9_TRADER,
        LogCategory.C9_ZUES,
        LogCategory.CLIENT,
      ],
    });

    expect(files).toStrictEqual([
      'C9Zeus.2529612.log',
      'C9Zeus.1.log',
      'C9Trader.25296.log',
      'C9Trader.25.log',
    ]);
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

    const files = file.getLatestModifiedFiles(folderPath, {
      includeOnly: [
        LogCategory.C9_TRADER,
        LogCategory.C9_ZUES,
        LogCategory.CLIENT,
      ],
      type: Platform.IV,
    });
    const firstModifiedFile: IFile = {
      fileName: logs[0],
      platform: Platform.IV,
      modifiedTimestamp: new Date(now.getTime() - 360 * 60 * 1000).getTime(),
      path: 'C:\\abc\\' + logs[0],
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

    const files = file.getLatestModifiedFiles(folderPath, {
      includeOnly: [
        LogCategory.C9_TRADER,
        LogCategory.C9_ZUES,
        LogCategory.CLIENT,
      ],
      type: Platform.IV,
    });
    const result = new Map<string, IFile>();
    const firstModifiedFile: IFile = {
      fileName: logs[0],
      platform: Platform.IV,
      modifiedTimestamp: new Date(now.getTime() - 15 * 60 * 1000).getTime(),
      path: 'C:\\abc\\' + logs[0],
    };
    const secondModifiedFile: IFile = {
      fileName: logs[2],
      platform: Platform.IV,
      modifiedTimestamp: new Date(now.getTime() - 15 * 60 * 1000).getTime(),
      path: 'C:\\abc\\' + logs[2],
    };

    result.set(LogCategory.LATEST + '_0', firstModifiedFile);
    result.set(LogCategory.LATEST + '_2', secondModifiedFile);

    if (isLinux || isMac) {
      expect(files?.get(LogCategory.LATEST + '_0')).toEqual(undefined);
      expect(files?.get(LogCategory.LATEST + '_2')).toEqual(undefined);
    } else {
      expect(files?.get(LogCategory.LATEST + '_' + logs[0])).toEqual(
        firstModifiedFile,
      );
      expect(files?.get(LogCategory.LATEST + '_' + logs[2])).toEqual(
        secondModifiedFile,
      );
    }
  });
});
