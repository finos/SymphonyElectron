const { exec } = require('child_process');
const log = require('../../log.js');
const logLevels = require('../../enums/logLevels.js');

let getProcessID = function (callback) {

    exec('ps -A | grep electron', (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, 'PID: Error getting pid' + error);
            return callback(false);
        }
        if (stderr) {
            log.send(logLevels.WARN, 'PID: Error getting pid' + stderr);
        }

        let data = stdout.trim().split("\n");
        let pid = data[0].split('?');
        return callback(pid[ 0 ]);
    });
};

let launchd = function (pid, script, dataPath) {
    let _pid = parseInt(pid, 10);
    exec(`sh ${script} true ${_pid} ${dataPath}`, (error, stdout, stderr) => {
        if (error) {
            log.send(logLevels.ERROR, 'Lanuchd: Error creating script');
        }
        if (stderr) {
            log.send(logLevels.ERROR, 'Lanuchd: Error creating script');
        }
        log.send(logLevels.INFO, 'Lanuchd: Creating successful')
    });
};

module.exports = {
    getProcessID,
    launchd
};