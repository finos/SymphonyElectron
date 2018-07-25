const childProcess = require('child_process');
const { isMac } = require('../../js/utils/misc.js');
// const applescript = require('applescript');

class Utils {
    static async openAppInMaximize(appPath) {
        if (isMac) {
            var applescript = require('applescript');
            var script = 'tell application "TextEdit" tell window 1 set zoomed to true end tell end tell';
            await applescript.execFile("test", function (err, rtn) {
                if (err) {
                    console.log(err);
                }
                if (Array.isArray(rtn)) {
                    rtn.forEach(function (songName) {
                        console.log(songName);
                    });
                }
            });
            //await applescript.execString('tell application "TextEdit" tell window 1 set zoomed to true end tell end tell');
        } else {
            await childProcess.exec('start /MAX ' + appPath);
        }
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