const { exec } = require('child_process');
const os = require('os');
const { randomString } = require('./randomString.js');
const log = require('../../log.js');
const logLevels = require('../../enums/logLevels.js');
const Winreg = require('winreg');

/**
 * Register for creating launch agent
 * @type {Registry}
 */
const regKey = new Winreg({
    hive: Winreg.HKCU,
    key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
});

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
 * @param clearScript
 */
function taskScheduler(script, dataFolder, pid, clearScript) {
    let userName;
    if (os.userInfo) {
        userName = os.userInfo().username;
    } else {
        try {
            userName = (exec.execSync('whoami').stdout).replace(/^.*\\/, '')
        } catch (e) {
            log.send(logLevels.WARN, `whoami failed (using randomString): ${e}`);
            userName = randomString();
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

    winRegScript(userName, clearScript, dataFolder);
}

/**
 * Clear the data folder on user login for first time
 * @param userName
 * @param script
 * @param dataFolder
 */
function winRegScript(userName, script, dataFolder) {
    regKey.set(`SymphonyTask-${userName}`, Winreg.REG_SZ, `${script} ${dataFolder}`, function(err) {
        if (err !== null) {
            log.send(logLevels.INFO, `winReg: Creating task failed ${err}`);
        }
        log.send(logLevels.INFO, 'winReg: Creating task successful');
    });
}

module.exports = {
    launchAgent,
    launchDaemon,
    taskScheduler
};