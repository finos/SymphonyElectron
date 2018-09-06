const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const { isMac } = require('../../js/utils/misc');

class Utils {
    static async openAppInMaximize(appPath) {
        if (isMac) {
            const osascript = require('node-osascript');
            await osascript.execute('if application "' + appPath + '" is running then \n do shell script ("pkill -9 ' + appPath + '*") \n end if \n delay 5 \n tell application "' + appPath + '" \n activate \n tell window 1 \n set zoomed to true \n end tell \n end tell');
        } else {
            await childProcess.exec('start /MAX ' + appPath);
        }
    }

    static async killProcess(processName) {
        if (isMac) {
            const osascript = require('node-osascript');
            await osascript.execute('if application "' + processName + '" is running then \n do shell script ("pkill -9 ' + processName + '*") \n end if \n delay 5');
        } else {
            await childProcess.exec('taskkill /f /t /im ' + processName);
        }
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

    static execPromise(command) {
        return new Promise(function (resolve, reject) {
            childProcess.exec(command, (error, stdout, stderr) => {
                resolve(stdout.trim());
            });
        });
    }
}

module.exports = Utils;
