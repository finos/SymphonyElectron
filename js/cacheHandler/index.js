const fs = require('fs');
const nodePath = require('path');
const electron = require('electron');

const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

function handleCacheFailureCheckOnStartup() {

    const cacheCheckFilename = 'CacheCheck';
    const cacheCheckFilePath = nodePath.join(electron.app.getPath('userData'), cacheCheckFilename);

    return new Promise((resolve) => {

        if (fs.existsSync(cacheCheckFilePath)) {
            log.send(logLevels.INFO, `Cache check file exists, so not clearing cache!`);
            fs.unlinkSync(cacheCheckFilePath);
            resolve();
        } else {
            log.send(logLevels.INFO, `Cache check file does not exist, we are clearing the cache!`);
            electron.session.defaultSession.clearCache(() => {
                log.send(logLevels.INFO, `Cleared cache!`);
                resolve();
            });
        }

    });

}

function handleCacheFailureCheckOnExit() {
    log.send(logLevels.INFO, `Clean exit! Creating cache check file!`);
    const cacheCheckFilename = 'CacheCheck';
    const cacheCheckFilePath = nodePath.join(electron.app.getPath('userData'), cacheCheckFilename);
    fs.writeFileSync(cacheCheckFilePath, "");
}

module.exports = {
    handleCacheFailureCheckOnStartup: handleCacheFailureCheckOnStartup,
    handleCacheFailureCheckOnExit: handleCacheFailureCheckOnExit
};
