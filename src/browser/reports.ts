import { app, BrowserWindow, dialog, shell } from 'electron';
import * as fs from 'fs';

import * as electron from 'electron';
import { isMac } from '../common/env';
import { i18n } from '../common/i18n';
import { generateArchiveForDirectory } from '../common/utils';

export const exportLogs = (): void => {
    const FILE_EXTENSIONS = [ '.log' ];
    const MAC_LOGS_PATH = '/Library/Logs/Symphony/';
    const WINDOWS_LOGS_PATH = '\\AppData\\Roaming\\Symphony\\logs';

    const logsPath = isMac ? MAC_LOGS_PATH : WINDOWS_LOGS_PATH;
    const source = app.getPath('home') + logsPath;
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!fs.existsSync(source) && focusedWindow && !focusedWindow.isDestroyed()) {
        dialog.showMessageBox(focusedWindow, {
            message: i18n.t('No logs are available to share'),
            title: i18n.t('Failed!'),
            type: 'error',
        });
        return;
    }
    const destPath = isMac ? '/logs_symphony_' : '\\logs_symphony_';
    const timestamp = new Date().getTime();
    const destination = app.getPath('downloads') + destPath + timestamp + '.zip';

    generateArchiveForDirectory(source, destination, FILE_EXTENSIONS)
        .then(() => {
            shell.showItemInFolder(destination);
        })
        .catch((err) => {
            if (focusedWindow && !focusedWindow.isDestroyed()) {
                dialog.showMessageBox(focusedWindow, {
                    message: `${i18n.t('Unable to generate logs due to ')} ${err}`,
                    title: i18n.t('Failed!'),
                    type: 'error',
                });
            }
        });
};

export const exportCrashDumps = (): void => {
    const FILE_EXTENSIONS = isMac ? [ '.dmp' ] : [ '.dmp', '.txt' ];
    const crashesDirectory = (electron.crashReporter as any).getCrashesDirectory();
    const source = isMac ? crashesDirectory + '/completed' : crashesDirectory;
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!fs.existsSync(source) || fs.readdirSync(source).length === 0 && focusedWindow && !focusedWindow.isDestroyed()) {
        electron.dialog.showMessageBox(focusedWindow as BrowserWindow, {
            message: i18n.t('No crashes available to share'),
            title: i18n.t('Failed!'),
            type: 'error',
        });
        return;
    }

    const destPath = isMac ? '/crashes_symphony_' : '\\crashes_symphony_';
    const timestamp = new Date().getTime();

    const destination = electron.app.getPath('downloads') + destPath + timestamp + '.zip';

    generateArchiveForDirectory(source, destination, FILE_EXTENSIONS)
        .then(() => {
            electron.shell.showItemInFolder(destination);
        })
        .catch((err) => {
            if (focusedWindow && !focusedWindow.isDestroyed()) {
                electron.dialog.showMessageBox(focusedWindow, {
                    message: `${i18n.t('Unable to generate crash reports due to ')} ${err}`,
                    title: i18n.t('Failed!'),
                    type: 'error',
                });
            }
        });
};