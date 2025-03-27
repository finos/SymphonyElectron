import * as zip from 'adm-zip';
import { app, BrowserWindow, dialog, shell, WebContents } from 'electron';
import * as fs from 'fs';
import { homedir as getHomedir } from 'os';
import * as path from 'path';

import { ILogs } from '../common/api-interface';
import { isLinux, isMac, isWindowsOS } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import {
  IReportLog,
  LogCategory,
  LogType,
  LogUtilities,
  RemoveIVLogs,
  RetrieveIVLogs,
  RetrieveLatestModifiedLogs,
} from './interfaces/reports-handlers.interface';

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

const validateFilename = (filename: string): string => {
  return filename?.replace(/[^a-zA-Z0-9/_\.-]/g, '_');
};

const writeLogs = async (retrievedLogs: ILogs[]) => {
  for await (const logs of retrievedLogs) {
    for (const logFile of logs.logFiles) {
      const sanitizedFilename = validateFilename(logFile.filename);
      if (!sanitizedFilename) {
        continue;
      }
      // nosemgrep
      const file = path.join(app.getPath('logs'), sanitizedFilename);
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

  removeLastIVLogs(logsPath);
  extractIVLogs(logsPath);
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

const getLatestModifiedLogs: RetrieveLatestModifiedLogs = (
  logsFolderPath: string,
  options = {
    includeOnly: [''],
    type: '',
  },
) => {
  const logFiles = fs.readdirSync(logsFolderPath);
  const now = new Date();
  const lastModifiedLogsList = new Map<string, IReportLog>();
  let latestModifiedLogTimestamp = 0;

  logFiles?.forEach((file, index) => {
    const sanitizedLogname = validateFilename(file);
    const sanitizedFolderPath = validateFilename(logsFolderPath);
    if (!sanitizedLogname) {
      return;
    }
    const logFilePath = path.join(sanitizedFolderPath, sanitizedLogname);
    const logFileStats = fs.statSync(logFilePath);
    const currentLogModifiedTimestamp = logFileStats.mtime.getTime();

    if (
      logFileStats.isFile() &&
      options.includeOnly?.some((option) => file.toLowerCase().includes(option))
    ) {
      const logLastModifiedTimestamp = new Date(logFileStats.mtime);
      const timestampDiffInMinutes =
        (now.getTime() - logLastModifiedTimestamp.getTime()) /
        LogUtilities.ONE_MINUTE;
      const reportLog: IReportLog = {
        logName: file,
        logType: options.type ?? LogType.IV,
        modifiedTimestamp: currentLogModifiedTimestamp,
      };

      if (
        timestampDiffInMinutes <= LogUtilities.LOG_TIMESTAMP_THRESH_HOLD &&
        logFileStats.mtime.getTime() > latestModifiedLogTimestamp
      ) {
        lastModifiedLogsList.set(`${LogCategory.LATEST}_${index}`, reportLog);
        latestModifiedLogTimestamp = logFileStats.mtime.getTime();
      } else if (currentLogModifiedTimestamp > latestModifiedLogTimestamp) {
        lastModifiedLogsList.set(`${LogCategory.RECENT}`, reportLog);
        latestModifiedLogTimestamp = currentLogModifiedTimestamp;
      }
    }
  });

  return lastModifiedLogsList;
};

const removeLastIVLogs: RemoveIVLogs = (logsPath: string) => {
  const ivLogsList = getLatestModifiedLogs(logsPath, {
    includeOnly: [LogCategory.C9_TRADER, LogCategory.C9_ZUES],
  });

  ivLogsList.forEach((log) => {
    const logPath = `${logsPath}/${log.logName}`;

    try {
      fs.unlinkSync(logPath);
      logger.info(`reports-handler: removed ${log.logName}`);
    } catch (e) {
      logger.error(`reports-handler: Error in removing file - ${e}`);
    }
  });
};

const extractIVLogs: RetrieveIVLogs = (logsPath: string) => {
  const ivFolderPath = path.join(
    getHomedir(),
    'AppData',
    'Local',
    'Cloud9_Technologies',
    'C9Trader',
    'log',
  );
  const ivLogsList = getLatestModifiedLogs(ivFolderPath);

  if (ivLogsList.size < 1) {
    logger.error(`reports-handler: Cannot copy log, logs arent exist`);
  } else {
    try {
      ivLogsList.forEach((log) => {
        logger.info(`reports-handler: Start reading logs, ${log.logName}`);
        const ivLog = fs.readFileSync(`${ivFolderPath}/${log.logName}`);

        if (ivLog) {
          logger.info(`reports-handler: Log found start copying content`);
          fs.writeFileSync(`${logsPath}/${log.logName}`, ivLog);
        } else {
          logger.error(`reports-handler: ${log} cannot be found.`);
        }
      });
    } catch (e) {
      logger.error(`reports-handler: ${e}`);
    }
  }
};
