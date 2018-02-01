const { exec } = require('child_process');
const electron = require('electron');
const app = electron.app;
const log = require('../../log.js');
const logLevels = require('../../enums/logLevels.js');

/**
 * Gets the application current Process ID
 * @param callback
 */
function getProcessID(callback) {

    exec(`ps -A | grep ${app.getName()}`, (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, `PID: Error getting pid ${error}`);
            return callback(false);
        }
        if (stderr) {
            log.send(logLevels.WARN, `PID: Error getting pid ${stderr}`);
        }

        let data = stdout.trim().split("\n");
        let pid = data[0].split('?');
        return callback(pid[ 0 ]);
    });
}

/**
 * Clears the data folder on app crash
 * @param pid
 * @param script
 * @param cb (callback)
 */
function launchAgent(pid, script, cb) {
    let _pid = parseInt(pid, 10);
    exec(`sh "${script}" true ${_pid}`, (error, stdout, stderr) => {
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

/**
 * Windows clears the data folder on app crash
 * @param script
 * @param dataFolder
 */
function taskScheduler(script, dataFolder) {
    exec(`SCHTASKS /Create /SC MINUTE /TN SymphonySearchTask /TR "'${script}' '${dataFolder}'"`)
}

module.exports = {
    getProcessID,
    launchAgent,
    launchDaemon,
    taskScheduler
};