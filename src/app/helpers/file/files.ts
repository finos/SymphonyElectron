import * as fs from 'fs';
import path = require('path');
import { logger } from '../../../common/logger';
import { IFile } from '../../interfaces/file.interface';
import {
  LogCategory,
  LogUtilities,
  Platform,
} from '../../interfaces/reports-handlers.interface';
import { isValidWindowsFileName, isValidWindowsFilePath } from './files-helper';

export class Files {
  private files = new Map<string, IFile>();

  public retrieveFilesInFolders = (
    sourcePath: string,
    options: {
      includeOnly?: string[];
      type?: string;
    },
  ) => {
    if (!fs.existsSync(sourcePath)) {
      logger.info('files-factory: folder does not exist');
      return undefined;
    }

    const logFiles = fs.readdirSync(sourcePath);
    logger.info(`files-factory: found ${logFiles.length} log(s)`);

    return logFiles?.filter((file) => {
      return options?.includeOnly?.some((format) =>
        file.toLowerCase().includes(format),
      );
    });
  };

  /**
   * Archives files in the source directory
   * that matches the given file extension
   *
   * @param sourcePath {String} source path
   * @param options additional options to get the files
   * @param options.includeOnly: took value from LogCategory
   * @param options.type: type of files
   * @return {Promise<void>}
   */
  public getLatestModifiedFiles = (
    sourcePath: string,
    options: {
      includeOnly?: string[];
      type?: string;
    },
  ) => {
    if (!fs.existsSync(sourcePath)) {
      logger.info('files-factory: folder does not exist');
      return undefined;
    }

    const logFiles = fs.readdirSync(sourcePath);
    logger.info(`files-factory: found ${logFiles.length} log(s)`);
    const now = new Date();
    let latestModifiedLogTimestamp = 0;

    logFiles?.forEach((file) => {
      const isValidLogName = isValidWindowsFileName(file);
      const isValidsourcePath = isValidWindowsFilePath(
        path.normalize(sourcePath),
      );

      if (!isValidLogName || !isValidsourcePath) {
        logger.info(
          'files-factory: Malformed log path or name, log is excluded',
        );
        return;
      }

      const logFilePath = path.join(sourcePath, file);
      logger.info(`files-factory: constructing ${logFilePath}`);

      const logFileStats = fs.statSync(logFilePath);
      const currentLogModifiedTimestamp = logFileStats.mtime.getTime();

      if (
        logFileStats.isFile() &&
        file.includes('.log') &&
        file.split('.log').filter((word) => !word).length < 2 &&
        options?.includeOnly?.some((option) =>
          file.toLowerCase().includes(option),
        )
      ) {
        logger.info(
          `files-factory: include only files by format - ${
            options.includeOnly.length > 1
              ? options.includeOnly.concat(',')
              : options.includeOnly.length === 1
              ? options.includeOnly
              : 'none'
          }`,
        );

        const logLastModifiedTimestamp = new Date(logFileStats.mtime);
        const timestampDiffInMinutes =
          (now.getTime() - logLastModifiedTimestamp.getTime()) /
          LogUtilities.ONE_MINUTE;
        const modifiedFile: IFile = {
          fileName: file,
          platform: options?.type ?? Platform.IV,
          modifiedTimestamp: currentLogModifiedTimestamp,
          path: logFilePath,
        };

        if (timestampDiffInMinutes <= LogUtilities.LOG_TIMESTAMP_THRESHOLD) {
          logger.info(
            `files-factory: recent log found, temporarily added as latest - ${LogCategory.LATEST}_${file}`,
          );
          this.files.set(`${LogCategory.LATEST}_${file}`, modifiedFile);
          latestModifiedLogTimestamp = logFileStats.mtime.getTime();
        } else if (currentLogModifiedTimestamp > latestModifiedLogTimestamp) {
          logger.info(
            `files-factory: recent log not found, temporarily added as recent - ${LogCategory.RECENT}`,
          );
          this.files.set(LogCategory.RECENT, modifiedFile);
          latestModifiedLogTimestamp = currentLogModifiedTimestamp;
        }
      }
    });

    if (this.files.size > 1) {
      logger.info(`files-factory: latest log found, remove recent log`);
      this.files.delete(LogCategory.RECENT);
    }

    return this.files;
  };
}
