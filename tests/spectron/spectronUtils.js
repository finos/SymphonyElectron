const childProcess = require('child_process');
<<<<<<< HEAD
=======
const path = require('path');
const fs = require('fs');
>>>>>>> Add test

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
<<<<<<< HEAD
=======

    static getFolderPath(folderName){
        return path.join(require('os').homedir(), folderName);
    }

    static getFiles(path){
        return fs.readdirSync(path);
    }
>>>>>>> Add test
}

module.exports = Utils;