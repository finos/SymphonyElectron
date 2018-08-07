const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');

class Utils {
    static async openAppInMaximize(appPath) {
        await childProcess.exec('start /MAX ' + appPath);
    }

    static async killProcess(processName) {
        await childProcess.exec('taskkill /f /t /im ' + processName);
    }

    static async sleep(second) {
        return new Promise(resolve => {
            setTimeout(resolve, this.toMs(second));
        })
    }

    static getFolderPath(folderName) {
        return path.join(require('os').homedir(), folderName);
    }

    static getFiles(path) {
        return fs.readdirSync(path);
    }

    static toMs(second) {
        return second * 1000;
    }

    static async randomString() {
        var chars = await "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length = await 8;
        var randomstring = await '';
        for (var i = 0; i < string_length; i++) {
            var rnum = await Math.floor(Math.random() * chars.length);
            randomstring += await chars.substring(rnum, rnum + 1);
        }
        return randomstring;
    }
}

module.exports = Utils;
