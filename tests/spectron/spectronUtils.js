const childProcess = require('child_process');

class Utils {
    static async openAppInMaximize(appPath) {
        await childProcess.exec('start /MAX ' + appPath);
    }

    static async killProcess(processName) {
        await childProcess.exec('taskkill /f /t /im ' + processName);
    }

    static async sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms)
        })
    }
}

module.exports = Utils;