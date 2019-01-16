import { app, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Cache check file path
const cacheCheckFilePath: string = path.join(app.getPath('userData'), 'CacheCheck');

/**
 * Deletes app cache file if exists or clears
 * the cache for the session
 */
export const cleanUpAppCache = async (): Promise<void> => {
    if (fs.existsSync(cacheCheckFilePath)) {
        await fs.unlinkSync(cacheCheckFilePath);
        return;
    }
    await new Promise((resolve) => session.defaultSession ? session.defaultSession.clearCache(resolve) : null);
};

/**
 * Creates a new file cache file on app exit
 */
export const createAppCacheFile = (): void => {
    fs.writeFileSync(cacheCheckFilePath, '');
};