const { exec } = require('child_process');
const { isMac } = require('../../utils/misc');

function checkDiskSpace(path, callback) {
    if (!path) {
        return "Please provide path"
    }

    if (isMac) {
        exec("df -k '" + path.replace(/'/g,"'\\''") + "'", (error, stdout, stderr) => {
            if (error) {
                if (stderr.indexOf("No such file or directory") !== -1) {
                    return callback("No such file or directory : " + error)
                }
                return callback("Error : " + error)
            }

            let data = stdout.trim().split("\n");

            let disk_info_str = data[data.length - 1].replace( /[\s\n\r]+/g,' ');
            let freeSpace = disk_info_str.split(' ');
            return callback(null, freeSpace[3] * 1024);
        });
    } else {
        exec(`fsutil volume diskfree ${path}`, (error, stdout, stderr) => {
            if (error) {
                if (stderr.indexOf("No such file or directory") !== -1) {
                    return callback("No such file or directory : " + error)
                }
                return callback("Error : " + error)
            }
            let data = stdout.trim().split("\n");

            let disk_info_str = data[data.length - 1].split(':');
            return callback(null, disk_info_str[1]);
        });
    }

    return null;
}

module.exports = {
    checkDiskSpace: checkDiskSpace
};