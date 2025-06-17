import * as zip from 'adm-zip';
import { app, BrowserWindow, dialog, shell, WebContents } from 'electron';
import * as fs from 'fs';
import { homedir as getHomedir } from 'os';
import * as path from 'path';

import { ILogs } from '../common/api-interface';
import { isLinux, isMac, isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { FilesFactory } from './helpers/file/files-factory';
import {
  copyFileUsingReadWrite,
  isValidWindowsFileName,
} from './helpers/file/files-helper';
import {
  LogCategory,
  RemoveIVLogs,
  RetrieveIVLogs,
} from './interfaces/reports-handlers.interface';

const IVLogFiles = FilesFactory.create();

/**
 * Archives files in the source directory
 * that matches the given file extension
 *
 * @param source {String} source path
 * @param destination {String} destination path
 * @param fileExtensions {Array} array of file ext
 * @param retrievedLogs {Array} array of client logs
 * @return {Promise<void>}
 */
const generateArchiveForDirectory = (
  source: string,
  destination: string,
  fileExtensions: string[],
  retrievedLogs: ILogs[],
): Promise<void> => {
  logger.info(`reports-handler: generating archive for directory ${source}`);
  const archive = new zip();
  const filesForCleanup: string[] = [];
  const files = fs.readdirSync(source);
  files
    .filter((file) => fileExtensions.indexOf(path.extname(file)) !== -1)
    .forEach((file) => {
      switch (path.extname(file)) {
        case '.log':
          archive.addLocalFile(source + '/' + file, 'logs');
          break;
        case '.dmp':
        case '.txt': // on Windows .txt files will be created as part of crash dump
          archive.addLocalFile(source + '/' + file, 'crashes');
          break;
        default:
          break;
      }
    });

  for (const logs of retrievedLogs) {
    for (const logFile of logs.logFiles) {
      const file = path.join(source, logFile.filename);
      archive.addLocalFile(file, 'logs');
      filesForCleanup.push(file);
    }
  }
  return archive
    .writeZipPromise(destination)
    .then(() => {
      logger.info('reports-handler: successfully created archive');
    })
    .catch((error) => {
      logger.error('reports-handler: error while archiving ', error);
    });
};

let logWebContents: WebContents;
const logTypes: string[] = [];
const receivedLogs: ILogs[] = [];

const writeLogs = async (retrievedLogs: ILogs[]) => {
  for await (const logs of retrievedLogs) {
    for (const logFile of logs.logFiles) {
      const isValidFileName = isValidWindowsFileName(logFile.filename);
      if (!isValidFileName) {
        continue;
      }
      // nosemgrep
      const file = path.join(app.getPath('logs'), logFile.filename);
      await writeDataToFile(file, logFile.contents);
    }
  }
};
export const registerLogRetriever = (
  sender: WebContents,
  logName: string,
): void => {
  logWebContents = sender;
  logTypes.push(logName);
};

export const collectLogs = (): void => {
  logWebContents.send('collect-logs');
};

/**
 * Compress and export logs stored under system log directory
 *
 * MacOS - /Library/Logs/Symphony/
 * Windows - AppData\Roaming\Symphony\logs
 */
export const packageLogs = async (retrievedLogs: ILogs[]): Promise<void> => {
  const FILE_EXTENSIONS = ['.log'];
  const logsPath = app.getPath('logs');
  const focusedWindow = BrowserWindow.getFocusedWindow();

  if (
    !fs.existsSync(logsPath) &&
    focusedWindow &&
    !focusedWindow.isDestroyed()
  ) {
    logger.error(`reports-handler: Can't find any logs to share!`);
    dialog.showMessageBox(focusedWindow, {
      message: i18n.t(`Can't find any logs to share!`)(),
      title: i18n.t('Failed!')(),
      type: 'error',
    });
    return;
  }
  const destPath = isMac || isLinux ? '/logs_symphony_' : '\\logs_symphony_';
  const timestamp = new Date().getTime();
  const destination = app.getPath('downloads') + destPath + timestamp + '.zip';

  if (isWindowsOS) {
    removeLastIVLogs(logsPath);
    extractIVLogs();
  }

  await writeLogs(retrievedLogs);
  generateArchiveForDirectory(
    logsPath,
    destination,
    FILE_EXTENSIONS,
    retrievedLogs,
  )
    .then(() => {
      shell.showItemInFolder(destination);
    })
    .catch((err) => {
      if (focusedWindow && !focusedWindow.isDestroyed()) {
        logger.error(`reports-handler: Can't share logs due to error ${err}`);
        dialog.showMessageBox(focusedWindow, {
          message: `${i18n.t('Unable to generate logs due to ')()} ${err}`,
          title: i18n.t('Failed!')(),
          type: 'error',
        });
      }
    });
};

export const addLogs = (logs: ILogs) => {
  const existingLogIndex = receivedLogs.findIndex(
    (receivedLog) => receivedLog.logName === logs.logName,
  );
  if (existingLogIndex === -1) {
    receivedLogs.push(logs);
  } else {
    const existingLog = receivedLogs[existingLogIndex];
    const existingLogFileIndex = existingLog.logFiles.findIndex(
      (logFile) => logFile.filename === logs.logFiles[0].filename,
    );

    if (existingLogFileIndex === -1) {
      existingLog.logFiles.push(logs.logFiles[0]);
    } else {
      const logContent = `${existingLog.logFiles[existingLogFileIndex].contents} \n ${logs.logFiles[0].contents}`;
      const logEntries = logContent.split('\n');
      const uniqueLogEntries = new Set(logEntries);
      const filteredLogEntries = [...uniqueLogEntries];
      existingLog.logFiles[existingLogFileIndex].contents =
        filteredLogEntries.join('\n');
    }
  }
};

export const finalizeLogExports = (logs: ILogs) => {
  receivedLogs.push(logs);

  let allReceived = true;
  for (const logType of logTypes) {
    const found = receivedLogs.some((log) => log.logName === logType);
    if (!found) {
      allReceived = false;
    }
  }

  if (allReceived) {
    packageLogs(receivedLogs);
    receivedLogs.length = 0;
  }
};

export const exportLogs = (): void => {
  if (logTypes.length > 0) {
    collectLogs();
  } else {
    packageLogs([]);
  }
};

/**
 * Compress and export crash dump stored under system crashes directory
 */
export const exportCrashDumps = (): void => {
  const FILE_EXTENSIONS = isMac ? ['.dmp'] : ['.dmp', '.txt'];
  const source = getCrashesDirectory();
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (
    !fs.existsSync(source) ||
    (fs.readdirSync(source).length === 0 &&
      focusedWindow &&
      !focusedWindow.isDestroyed())
  ) {
    dialog.showMessageBox(focusedWindow as BrowserWindow, {
      message: i18n.t('No crashes available to share')(),
      title: i18n.t('Failed!')(),
      type: 'error',
    });
    return;
  }

  const destPath =
    isMac || isLinux ? '/crashes_symphony_' : '\\crashes_symphony_';
  const timestamp = new Date().getTime();

  const destination = app.getPath('downloads') + destPath + timestamp + '.zip';

  generateArchiveForDirectory(source, destination, FILE_EXTENSIONS, [])
    .then(() => {
      shell.showItemInFolder(destination);
    })
    .catch((err) => {
      if (focusedWindow && !focusedWindow.isDestroyed()) {
        dialog.showMessageBox(focusedWindow, {
          message: `${i18n.t(
            'Unable to generate crash reports due to ',
          )()} ${err}`,
          title: i18n.t('Failed!')(),
          type: 'error',
        });
      }
    });
};

const getCrashesDirectory = (): string => {
  const crashesDirectory = app.getPath('crashDumps');
  let source = crashesDirectory;
  if (isMac) {
    source += '/completed';
  } else if (isWindowsOS) {
    source += '\\reports';
  }
  return source;
};

/**
 * Write data in chunk
 * @param chunk
 * @param stream
 */
const writeChunk = (chunk: string[], stream: fs.WriteStream): Promise<void> => {
  return new Promise((resolve, reject) => {
    const dataString = chunk.join('\n');
    stream.write(dataString + '\n', (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const writeDataToFile = async (filePath: string, data: string) => {
  const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  for (let chunkIndex = 0; chunkIndex < data.length; chunkIndex += 1000) {
    const chunk = data.slice(chunkIndex, chunkIndex + 1000);
    await writeChunk([chunk], writeStream);
  }

  writeStream.end();
};

const removeLastIVLogs: RemoveIVLogs = (logsPath: string) => {
  const ivLogsList = IVLogFiles.retrieveFilesInFolders(logsPath, {
    includeOnly: [
      LogCategory.C9_TRADER,
      LogCategory.C9_ZUES,
      LogCategory.CLIENT,
    ],
  });

  logger.info(
    `reports-handler: found ${ivLogsList?.length} old log(s) to be removed`,
  );
  ivLogsList?.forEach((log) => {
    const logPath = path.join(logsPath, log);
    if (!fs.existsSync(logPath)) {
      logger.info('reports-handler: log file check, not exist');
      return;
    }

    try {
      fs.unlinkSync(logPath);
      logger.info(`reports-handler: removed ${log}`);
    } catch (e) {
      logger.error(`reports-handler: Error in removing file - ${e}`);
    }
  });
};

const extractIVLogs: RetrieveIVLogs = () => {
  const ivFolderPath = path.join(
    getHomedir(),
    'AppData',
    'Local',
    'Cloud9_Technologies',
    'C9Trader',
    'log',
  );

  const files = IVLogFiles.getLatestModifiedFiles(ivFolderPath, {
    includeOnly: [
      LogCategory.C9_TRADER,
      LogCategory.C9_ZUES,
      LogCategory.CLIENT,
    ],
  });

  if (files) {
    logger.info(`reports-handler: starting to extract iv logs`);

    for (const file of files?.values()) {
      const newLogPath = path.join(
        getHomedir(),
        'AppData',
        'Local',
        'Symphony',
        'logs',
        file.fileName,
      );

      copyFileUsingReadWrite(file.path ?? '', newLogPath);
    }
  }
};
