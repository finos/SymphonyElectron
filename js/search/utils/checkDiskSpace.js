const { exec } = require('child_process');
const { isMac } = require('../../utils/misc');
const searchConfig = require('../searchConfig.js');

function checkDiskSpace(path, resolve, reject) {
    if (!path) {
        reject(new Error("Please provide path"));
        return;
    }

    if (isMac) {
        exec("df -k '" + path.replace(/'/g,"'\\''") + "'", (error, stdout, stderr) => {
            if (error) {
                if (stderr.indexOf("No such file or directory") !== -1) {
                    return reject(new Error("No such file or directory : " + error))
                }
                return reject(new Error("Error : " + error));
            }

            let data = stdout.trim().split("\n");

            let disk_info_str = data[data.length - 1].replace( /[\s\n\r]+/g,' ');
            let freeSpace = disk_info_str.split(' ');
            let space = freeSpace[3] * 1024;
            return resolve(space >= searchConfig.MINIMUM_DISK_SPACE);
        });
    } else {
        exec(`fsutil volume diskfree ${path}`, (error, stdout) => {
            if (error) {
                if (stdout.indexOf("Error:  The system cannot find the path specified.") !== -1) {
                    return reject(new Error("No such file or directory : " + error));
                }
                if (stdout.indexOf("The FSUTIL utility requires that you have administrative privileges.") !== -1) {
                    // this is temporary until we use the custom exe file.
                    return resolve(true);
                }
                return reject(new Error("Error : " + error));
            }
            if (stdout.indexOf("The FSUTIL utility requires that you have administrative privileges.") !== -1) {
                // this is temporary until we use the custom exe file.
                return resolve(true);
            }
            let data = stdout.trim().split("\n");

            let disk_info_str = data[data.length - 1].split(':');
            return resolve(disk_info_str[1] >= searchConfig.MINIMUM_DISK_SPACE);
        });
    }
}

module.exports = {
    checkDiskSpace: checkDiskSpace
};