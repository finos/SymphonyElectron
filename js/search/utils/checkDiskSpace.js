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
        exec(`${searchConfig.LIBRARY_CONSTANTS.FREE_DISK_SPACE} ${path}`, (error, stdout, stderr) => {
            if (error) {
                if (stderr.indexOf("The system cannot find the path specified.") !== -1) {
                    return reject(new Error("No such file or directory : " + error));
                }
                return reject(new Error("Error : " + error));
            }
            let data = stdout.trim().split(",");

            if (data[ 1 ] === "NOTREADY") {
                return reject(new Error("Error : Disk not ready"));
            }

            if (data[ 1 ] === "DISKNOTFOUND") {
                return reject(new Error("Error : Disk not found"));
            }

            let disk_info_str = data[ 0 ];
            return resolve(disk_info_str >= searchConfig.MINIMUM_DISK_SPACE);
        });
    }
}

module.exports = {
    checkDiskSpace: checkDiskSpace
};