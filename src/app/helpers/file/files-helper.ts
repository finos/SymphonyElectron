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

  public validateFilename = (filename: string): string => {
    return filename?.replace(/[^a-zA-Z0-9/_\.-]/g, '_');
  };

  public validateFilePath = (path: string) => {
    const unixPathRegex = /^\/([^\/]+\/)*([^\/]+)$/;
    const windowsPathRegex = /^[a-zA-Z]:\\([^\\]+\\)*([^\\]+)$/;

    if (isWindowsOS) {
      return windowsPathRegex.test(path);
    }

    return unixPathRegex.test(path);
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
      const sanitizedLogname = this.validateFilename(file);
      const sanitizedFolderPath = path.normalize(folderPath);

      if (!sanitizedLogname || !this.validateFilePath(sanitizedFolderPath)) {
        logger.error(
          'error',
          'file-helper: Log file has a malicious format to be exported',
        );
        return;
      }
      const logFilePath = path.join(sanitizedFolderPath, sanitizedLogname);
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
