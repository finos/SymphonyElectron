import { app, BrowserWindow, dialog, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { i18n } from '../common/i18n';

import { logger } from '../common/logger';

// Cache check file path
const userDataPath: string = app.getPath('userData');
const cacheCheckFilePath: string = path.join(userDataPath, 'CacheCheck');

/**
 * Cleans old cache
 */
const cleanOldCache = (): void => {
  const fileRemovalList = [
    'blob_storage',
    'Cache',
    'Cookies',
    'temp',
    'Cookies-journal',
    'GPUCache',
  ];

  const files = fs.readdirSync(userDataPath);

  files.forEach((file) => {
    // nosemgrep
    const filePath = path.join(userDataPath, file);
    if (!fileRemovalList.includes(file)) {
      return;
    }

    if (fs.lstatSync(filePath).isDirectory()) {
      rimraf.sync(filePath);
      return;
    }
    fs.unlinkSync(filePath);
  });
};

/**
 * Deletes app cache file if exists or clears
 * the cache for the session
 */
export const cleanUpAppCache = async (): Promise<void> => {
  if (fs.existsSync(cacheCheckFilePath)) {
    await fs.unlinkSync(cacheCheckFilePath);
    logger.info(
      `app-cache-handler: last exit was clean, deleted the app cache file`,
    );
    return;
  }
  if (session.defaultSession) {
    await session.defaultSession.clearCache();
    logger.info(
      `app-cache-handler: we didn't have a clean exit last time, so, cleared the cache that may have been corrupted!`,
    );
  }
};

/**
 * Creates a new file cache file on app exit
 */
export const createAppCacheFile = (): void => {
  logger.info(
    `app-cache-handler: this is a clean exit, creating app cache file`,
  );
  fs.writeFileSync(cacheCheckFilePath, '');
};

/**
 * Cleans the app cache on new install
 */
export const cleanAppCacheOnInstall = (): void => {
  logger.info(
    `app-cache-handler: cleaning app cache and cookies on new install`,
  );
  cleanOldCache();
};

/**
 * Cleans app cache and restarts the app on crash or unresponsive events
 * @param window Browser window to listen to for crash events
 */
export const cleanAppCacheOnCrash = (window: BrowserWindow): void => {
  logger.info(
    `app-cache-handler: listening to crash events & cleaning app cache`,
  );
  const events = ['unresponsive', 'crashed', 'plugin-crashed'];

  events.forEach((windowEvent: any) => {
    window.webContents.on(windowEvent, async () => {
      logger.info(
        `app-cache-handler: Window Event '${windowEvent}' occurred. Clearing cache & restarting app`,
      );
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (
        !focusedWindow ||
        (typeof focusedWindow.isDestroyed === 'function' &&
          focusedWindow.isDestroyed())
      ) {
        return;
      }
      const options = {
        type: 'question',
        title: i18n.t('Relaunch Application')(),
        message: i18n.t(
          'Oops! Something went wrong. Would you like to restart the app?',
        )(),
        buttons: [i18n.t('Restart')(), i18n.t('Cancel')()],
        cancelId: 1,
      };

      const { response } = await dialog.showMessageBox(focusedWindow, options);

      if (response === 0) {
        cleanOldCache();
        app.relaunch();
        app.exit();
      }
    });
  });
};
