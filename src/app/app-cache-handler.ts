import { app, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {logger} from "../common/logger";

// Cache check file path
const cacheCheckFilePath: string = path.join(app.getPath('userData'), 'CacheCheck');

/**
 * Deletes app cache file if exists or clears
 * the cache for the session
 */
export const cleanUpAppCache = async (): Promise<void> => {
    if (fs.existsSync(cacheCheckFilePath)) {
        await fs.unlinkSync(cacheCheckFilePath);
        logger.info(`app-cache-handler: last exit was clean, deleted the app cache file`);
        return;
    }
    await new Promise((resolve) => session.defaultSession ? session.defaultSession.clearCache(resolve) : null);
    logger.info(`app-cache-handler: we didn't have a clean exit last time, so, cleared the cache that may have been corrupted!`);
};

/**
 * Creates a new file cache file on app exit
 */
export const createAppCacheFile = (): void => {
    logger.info(`app-cache-handler: this is a clean exit, creating app cache file`);
    fs.writeFileSync(cacheCheckFilePath, '');
};
