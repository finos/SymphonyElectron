const { exec } = require('child_process');
const log = require('../../log.js');
const logLevels = require('../../enums/logLevels.js');

function getProcessID(callback) {

    exec('ps -A | grep Symphony', (error, stdout, stderr) => {
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

function launchd(pid, script) {
    let _pid = parseInt(pid, 10);
    exec(`sh "${script}" true ${_pid}`, (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${error}`);
        }
        if (stderr) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${stderr}`);
        }
        log.send(logLevels.INFO, 'Lanuchd: Creating successful')
    });
}

function startUpCleaner(script, dataPath) {
    exec(`sh ${script} true '${dataPath}'`, (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${error}`);
        }
        if (stderr) {
            log.send(logLevels.ERROR, `Lanuchd: Error creating script ${stderr}`);
        }
        log.send(logLevels.INFO, `Lanuchd: Creating successful ${stdout}`)
    });
}

function taskScheduler(script, dataFolder) {
    exec(`SCHTASKS /Create /SC MINUTE /TN SymphonySearchTask /TR "'${script}' '${dataFolder}'"`)
}

module.exports = {
    getProcessID,
    launchd,
    startUpCleaner,
    taskScheduler
};