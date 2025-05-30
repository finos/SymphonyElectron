import * as fs from 'fs';
import path = require('path');
import { isWindowsOS } from '../../../common/env';
import { logger } from '../../../common/logger';
import { IFile, IFiles } from '../../interfaces/file-helper.interface';
import {
  LogCategory,
  LogUtilities,
  Platform,
} from '../../interfaces/reports-handlers.interface';
import { Files } from './files';
import { FileHelperBase, GetLatestModifiedFiles } from './files-base-helper';

export class FileHelper extends FileHelperBase {
  private files: IFiles;
  constructor() {
    super();
    this.files = this.createFiles();
  }

  public get = () => {
    return this.files;
  };

  public set = (files: Files) => {
    return (this.files = files);
  };

  public sanitizeFilename = (filename: string): string => {
    return filename?.replace(/[^a-zA-Z0-9/_\.-]/g, '_');
  };

  public validateLogFileName = (filename: string) => {
    return !RegExp(/[^a-zA-Z0-9/_\.-]/g).test(filename);
  };

  public validateFilename = (filename) => {
    if (!filename || filename.length > 255) {
      return false;
    }

    const forbiddenChars = /[<>:"/\\|?*\x00-\x1F]/;
    if (forbiddenChars.test(filename)) {
      return false;
    }

    const reservedNames = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
    if (reservedNames.test(filename)) {
      return false;
    }

    if (filename.endsWith('.') || filename.endsWith(' ')) {
      return false;
    }

    if (
      filename.startsWith(' ') ||
      filename.startsWith('-') ||
      filename.startsWith('_') ||
      filename?.split('.')[0].endsWith(' ')
    ) {
      return false;
    }

    if (/\.\.+/.test(filename)) {
      return false;
    }

    return true;
  };

  public validateFilePath = (inputPath: string) => {
    if (!isWindowsOS) {
      return false;
    }
    try {
      const normalizedPath = path.win32.normalize(inputPath);
      const parsedPath = path.win32.parse(normalizedPath);

      if (parsedPath.root && !/^[a-zA-Z]:\\$/.test(parsedPath.root)) {
        return false;
      }
      if (
        !RegExp(
          /^(?:[a-zA-Z]:)?(?:[\/\\]{1,2}(?=[^\/\\])(?:\w[\w\s\-\.]*[\/\\])*)(?:\w[\w\s\-\.]*)$/,
        ).test(inputPath)
      ) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  public unsetFiles = () => {
    this.files = this.createFiles();
  };

  public getLatestModifiedFiles: GetLatestModifiedFiles = (
    folderPath: string,
    options = {
      includeOnly: [''],
      type: '',
    },
  ) => {
    if (!fs.existsSync(folderPath)) {
      logger.info('file-helper: IV Folder check, not exist');
      return undefined;
    }
    const logFiles = fs.readdirSync(folderPath);
    const now = new Date();
    let latestModifiedLogTimestamp = 0;

    logFiles?.forEach((file, index) => {
      const isValidFileName = this.validateFilename(file);
      const sanitizedFilename = this.sanitizeFilename(file);
      const sanitizedFolderPath = path.normalize(folderPath);
      const isValidFolderPath = this.validateFilePath(sanitizedFolderPath);
      const isValidLogName = this.validateLogFileName(file);

      if (!isValidFileName || !isValidFolderPath || !isValidLogName) {
        logger.info(
          'error',
          'file-helper: Log file has a malicious format to be exported',
        );
        return;
      }

      const logFilePath = path.join(sanitizedFolderPath, sanitizedFilename);
      const logFileStats = fs.statSync(logFilePath);
      const currentLogModifiedTimestamp = logFileStats.mtime.getTime();

      if (
        logFileStats.isFile() &&
        options.includeOnly?.some((option) =>
          file.toLowerCase().includes(option),
        )
      ) {
        const logLastModifiedTimestamp = new Date(logFileStats.mtime);
        const timestampDiffInMinutes =
          (now.getTime() - logLastModifiedTimestamp.getTime()) /
          LogUtilities.ONE_MINUTE;
        const modifiedFile: IFile = {
          fileName: file,
          platform: options.type ?? Platform.IV,
          modifiedTimestamp: currentLogModifiedTimestamp,
        };

        if (timestampDiffInMinutes <= LogUtilities.LOG_TIMESTAMP_THRESHOLD) {
          this.files.get().set(`${LogCategory.LATEST}_${index}`, modifiedFile);
          latestModifiedLogTimestamp = logFileStats.mtime.getTime();
        } else if (currentLogModifiedTimestamp > latestModifiedLogTimestamp) {
          this.files.get().set(LogCategory.RECENT, modifiedFile);
          latestModifiedLogTimestamp = currentLogModifiedTimestamp;
        }
      }
    });

    if (this.files.get().has(`${LogCategory.LATEST}_1`)) {
      this.files.get().delete(LogCategory.RECENT);
    }

    return this.files.get();
  };
}

export const fileHelper = new FileHelper();
