import * as archiver from 'archiver';
import { app, BrowserWindow, dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import { ILogs } from '../common/api-interface';
import { isLinux, isMac } from '../common/env';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';

/**
 * Archives files in the source directory
 * that matches the given file extension
 *
 * @param source {String} source path
 * @param destination {String} destination path
 * @param fileExtensions {Array} array of file ext
 * @return {Promise<void>}
 */
const generateArchiveForDirectory = (
  source: string,
  destination: string,
  fileExtensions: string[],
  retrievedLogs: ILogs[],
): Promise<void> => {
  return new Promise((resolve, reject) => {
    logger.info(`reports-handler: generating archive for directory ${source}`);
    const output = fs.createWriteStream(destination);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const filesForCleanup: string[] = [];

    output.on('close', () => {
      for (const file of filesForCleanup) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      logger.info(`reports-handler: generated archive for directory ${source}`);
      return resolve();
    });

    archive.on('error', (err: Error) => {
      for (const file of filesForCleanup) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      logger.error(
        `reports-handler: error archiving directory for ${source} with error ${err}`,
      );
      return reject(err);
    });

    archive.pipe(output);

    const files = fs.readdirSync(source);
    files
      .filter((file) => fileExtensions.indexOf(path.extname(file)) !== -1)
      .forEach((file) => {
        switch (path.extname(file)) {
          case '.log':
            archive.file(source + '/' + file, { name: 'logs/' + file });
            break;
          case '.dmp':
          case '.txt': // on Windows .txt files will be created as part of crash dump
            archive.file(source + '/' + file, { name: 'crashes/' + file });
            break;
          default:
            break;
        }
      });

    for (const logs of retrievedLogs) {
      for (const logFile of logs.logFiles) {
        const file = path.join(source, logFile.filename);
        fs.writeFileSync(file, logFile.contents);
        archive.file(file, { name: 'logs/' + logFile.filename });
        filesForCleanup.push(file);
      }
    }

    archive.finalize();
  });
};

let logWebContents: Electron.WebContents;
const logTypes: string[] = [];
const receivedLogs: ILogs[] = [];

export const registerLogRetriever = (
  sender: Electron.WebContents,
  logName: string,
): void => {
  logWebContents = sender;
  logTypes.push(logName);
};

export const collectLogs = (): void => {
  receivedLogs.length = 0;
  logWebContents.send('collect-logs');
};

/**
 * Compress and export logs stored under system log directory
 *
 * MacOS - /Library/Logs/Symphony/
 * Windows - AppData\Roaming\Symphony\logs
 */
export const packageLogs = (retrievedLogs: ILogs[]): void => {
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
  const crashesDirectory = app.getPath('crashDumps');
  const source = isMac ? crashesDirectory + '/completed' : crashesDirectory;
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
