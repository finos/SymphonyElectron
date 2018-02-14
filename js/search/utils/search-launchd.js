const { exec } = require('child_process');
const randomString = require('randomstring');
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
 * @param cb (callback)
 */
function launchDaemon(script, cb) {
    exec(`sh "${script}" true`, (error, stdout, stderr) => {
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
 * Windows clears the data folder on app crash
 * @param script
 * @param dataFolder
 */
function taskScheduler(script, dataFolder) {
    let taskName = `SymphonySearchTask${randomString.generate(4)}`;
    exec(`SCHTASKS /Create /SC MINUTE /TN ${taskName} /TR "'${script}' '${dataFolder}' '${taskName}'"`, (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating task ${error}`);
        }
        if (stderr) {
            log.send(logLevels.WARN, `Lanuchd: Error creating task ${stderr}`);
        }
        log.send(logLevels.INFO, `Lanuchd: Creating task successful ${stdout}`);
    });
}

module.exports = {
    launchAgent,
    launchDaemon,
    taskScheduler
};