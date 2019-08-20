import * as archiver from 'archiver';
import { app, BrowserWindow, dialog, shell } from 'electron';
import * as electron from 'electron';
import * as fs from 'fs';
import * as path from 'path';

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
const generateArchiveForDirectory = (source: string, destination: string, fileExtensions: string[]): Promise<void> => {

    return new Promise((resolve, reject) => {
        logger.info(`reports-handler: generating archive for directory ${source}`);
        const output = fs.createWriteStream(destination);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            logger.info(`reports-handler: generated archive for directory ${source}`);
            return resolve();
        });

        archive.on('error', (err: Error) => {
            logger.error(`reports-handler: error archiving directory for ${source} with error ${err}`);
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

        archive.finalize();
    });
};

/**
 * Compress and export logs stored under system log directory
 *
 * MacOS - /Library/Logs/Symphony/
 * Windows - AppData\Roaming\Symphony\logs
 */
export const exportLogs = (): void => {
    const FILE_EXTENSIONS = [ '.log' ];
    const MAC_LOGS_PATH = '/Library/Logs/Symphony/';
    const LINUX_LOGS_PATH = '/.config/Symphony/';
    const WINDOWS_LOGS_PATH = '\\AppData\\Roaming\\Symphony\\logs';

    const logsPath = isMac ? MAC_LOGS_PATH : isLinux ? LINUX_LOGS_PATH : WINDOWS_LOGS_PATH;
    const source = app.getPath('home') + logsPath;
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!fs.existsSync(source) && focusedWindow && !focusedWindow.isDestroyed()) {
        logger.error(`reports-handler: Can't find any logs to share!`);
        dialog.showMessageBox(focusedWindow, {
            message: i18n.t(`Can't find any logs to share!`)(),
            title: i18n.t('Failed!')(),
            type: 'error',
        });
        return;
    }
    const destPath = (isMac || isLinux) ? '/logs_symphony_' : '\\logs_symphony_';
    const timestamp = new Date().getTime();
    const destination = app.getPath('downloads') + destPath + timestamp + '.zip';

    generateArchiveForDirectory(source, destination, FILE_EXTENSIONS)
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

/**
 * Compress and export crash dump stored under system crashes directory
 */
export const exportCrashDumps = (): void => {
    const FILE_EXTENSIONS = isMac ? [ '.dmp' ] : [ '.dmp', '.txt' ];
    const crashesDirectory = (electron.crashReporter as any).getCrashesDirectory();
    const source = isMac ? crashesDirectory + '/completed' : crashesDirectory;
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!fs.existsSync(source) || fs.readdirSync(source).length === 0 && focusedWindow && !focusedWindow.isDestroyed()) {
        electron.dialog.showMessageBox(focusedWindow as BrowserWindow, {
            message: i18n.t('No crashes available to share')(),
            title: i18n.t('Failed!')(),
            type: 'error',
        });
        return;
    }

    const destPath = (isMac || isLinux) ? '/crashes_symphony_' : '\\crashes_symphony_';
    const timestamp = new Date().getTime();

    const destination = electron.app.getPath('downloads') + destPath + timestamp + '.zip';

    generateArchiveForDirectory(source, destination, FILE_EXTENSIONS)
        .then(() => {
            electron.shell.showItemInFolder(destination);
        })
        .catch((err) => {
            if (focusedWindow && !focusedWindow.isDestroyed()) {
                electron.dialog.showMessageBox(focusedWindow, {
                    message: `${i18n.t('Unable to generate crash reports due to ')()} ${err}`,
                    title: i18n.t('Failed!')(),
                    type: 'error',
                });
            }
        });
};
