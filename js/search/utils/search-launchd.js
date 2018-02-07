const { exec } = require('child_process');
const log = require('../../log.js');
const logLevels = require('../../enums/logLevels.js');

/**
 * Clears the data folder on app crash
 * @param pid
 * @param script
 * @param cb (callback)
 */
function launchAgent(pid, script, cb) {
    exec(`sh "${script}" true ${pid}`, (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${error}`);
            return cb(false);
        }
        if (stderr) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${stderr}`);
        }
        return cb(true);
    });
}

/**
 * Clears the data folder on boot
 * @param script
 * @param dataPath
 * @param cb (callback)
 */
function launchDaemon(script, dataPath, cb) {
    exec(`sh ${script} true '${dataPath}'`, (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${error}`);
            return cb(false);
        }
        if (stderr) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${stderr}`);
        }
        return cb(true);
    });
}

module.exports = {
    launchAgent,
    launchDaemon
};