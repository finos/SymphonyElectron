const child = require('child_process');
const path = require('path');
const isMac = require('../utils/misc.js').isMac;
const isDevEnv = require('../utils/misc.js').isDevEnv;
const searchConfig = require('../search/searchConfig.js');
const ROOT_PATH = isDevEnv ? path.join(__dirname, '..', '..') : searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH;

/**
 * Using the child process to execute the tar and lz4
 * compression and the final output of this function
 * will be compressed file with ext: .tar.lz4
 * @param pathToFolder
 * @param outputPath
 * @param callback
 */
function compression(pathToFolder, outputPath, callback) {
    if (isMac) {
        child.exec(`cd "${ROOT_PATH}" && tar cf - "${pathToFolder}" | "${searchConfig.LIBRARY_CONSTANTS.MAC_LIBRARY_FOLDER}/lz4.exec" > "${outputPath}.tar.lz4"`, (error, stdout, stderr) => {
            if (error) {
                return callback(new Error(error), null);
            }
            return callback(null, {
                stderr: stderr.toString().trim(),
                stdout: stdout.toString().trim()
            });
        })
    } else {
        child.exec(`cd "${ROOT_PATH}" && "${searchConfig.LIBRARY_CONSTANTS.WIN_LIBRARY_FOLDER}\\tar-win.exe" cf - "${pathToFolder}" | "${searchConfig.LIBRARY_CONSTANTS.LZ4_PATH}" > "${outputPath}.tar.lz4"`, (error, stdout, stderr) => {
            if (error) {
                return callback(new Error(error), null);
            }
            return callback(null, {
                stderr: stderr.toString().trim(),
                stdout: stdout.toString().trim()
            });
        })
    }
}

/**
 * This function decompress the file
 * and the ext should be .tar.lz4
 * the output will be the user index folder
 * @param pathName
 * @param callback
 */
function decompression(pathName, callback) {
    if (isMac) {
        child.exec(`cd "${ROOT_PATH}" && "${searchConfig.LIBRARY_CONSTANTS.MAC_LIBRARY_FOLDER}/lz4.exec" -d "${pathName}" | tar -xf - `, (error, stdout, stderr) => {
            if (error) {
                return callback(new Error(error), null);
            }
            return callback(null, {
                stderr: stderr.toString().trim(),
                stdout: stdout.toString().trim()
            });
        })
    } else {
        child.exec(`cd "${ROOT_PATH}" && "${searchConfig.LIBRARY_CONSTANTS.LZ4_PATH}" -d "${pathName}" | "${searchConfig.LIBRARY_CONSTANTS.WIN_LIBRARY_FOLDER}\\tar-win.exe" xf - `, (error, stdout, stderr) => {
            if (error) {
                return callback(new Error(error), null);
            }
            return callback(null, {
                stderr: stderr.toString().trim(),
                stdout: stdout.toString().trim()
            });
        })
    }
}

module.exports = {
    compression,
    decompression
};
