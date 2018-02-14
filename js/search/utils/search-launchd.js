const { exec } = require('child_process');
const os = require('os');
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
 * @param pid
 */
function taskScheduler(script, dataFolder, pid) {
    let userName;
    if (os.userInfo) {
        userName = os.userInfo().username;
    } else {
        try {
            userName = (exec.execSync('whoami').stdout).replace(/^.*\\/, '')
        } catch (e) {
            log.send(logLevels.WARN, `whoami failed (using randomString): ${e}`);
            userName = randomString.generate(4);
        }
    }
    exec(`SCHTASKS /Create /SC MINUTE /TN SymphonyTask${userName} /TR "'${script}' '${dataFolder}' 'SymphonyTask${userName}' '${pid}'" /F`, (error, stdout, stderr) => {
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