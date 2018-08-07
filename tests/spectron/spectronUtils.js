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

    static async sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms)
        })
    }

    static getFolderPath(folderName){
        return path.join(require('os').homedir(), folderName);
    }

    static getFiles(path){
        return fs.readdirSync(path);
    }

    static randomString() {
        var chars =  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length =  8;
        var randomstring =  '';
        for (var i=0; i<string_length; i++) {
            var rnum =  Math.floor(Math.random() * chars.length);
            randomstring +=  chars.substring(rnum,rnum+1);
        }
        return randomstring;
    }
}

module.exports = Utils;