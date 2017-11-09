const child = require('child_process');
const isMac = require('../utils/misc.js').isMac;
const electron = require('electron');
const app = electron.app;
const path = require('path');
const userData = path.join(app.getPath('userData'));
const isDevEnv = require('../utils/misc.js').isDevEnv;
const DATA_FOLDER_PATH = isDevEnv ? path.join(__dirname, '..', '..') : userData;

const execPath = path.dirname(app.getPath('exe'));

// lz4 library path
const libraryFolderPath = isDevEnv ? path.join(__dirname, '..', '..', 'library') : path.join(execPath, 'library');
const winArchPath = process.arch === 'ia32' ? 'lz4-win-x86.exe' : 'lz4-win-x64.exe';
const productionPath = path.join(execPath, libraryFolderPath, winArchPath);
const devPath = path.join(__dirname, '..', '..', 'library', winArchPath);
const macLibraryPath = isDevEnv ? path.join(__dirname, '..', '..', 'library') : path.join(execPath, '..', 'library');
const lz4Path = isDevEnv ? devPath : productionPath;

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
        child.exec(`cd "${DATA_FOLDER_PATH}" && tar cf - "${pathToFolder}" | "${macLibraryPath}/lz4.exec" > "${outputPath}.tar.lz4"`, (error, stdout, stderr) => {
            if (error) {
                return callback(new Error(error), null);
            }
            return callback(null, {
                stderr: stderr.toString().trim(),
                stdout: stdout.toString().trim()
            });
        })
    } else {
        child.exec(`cd "${DATA_FOLDER_PATH}" && "${libraryFolderPath}\\tar-win.exe" cf - "${pathToFolder}" | "${lz4Path}" > "${outputPath}.tar.lz4"`, (error, stdout, stderr) => {
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
function deCompression(pathName, callback) {
    if (isMac) {
        child.exec(`cd "${DATA_FOLDER_PATH}" && "${macLibraryPath}/lz4.exec" -d "${pathName}" | tar -xf - `, (error, stdout, stderr) => {
            if (error) {
                return callback(new Error(error), null);
            }
            return callback(null, {
                stderr: stderr.toString().trim(),
                stdout: stdout.toString().trim()
            });
        })
    } else {
        child.exec(`cd "${DATA_FOLDER_PATH}" && "${lz4Path}" -d "${pathName}" | "${libraryFolderPath}\\tar-win.exe" xf - `, (error, stdout, stderr) => {
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
    deCompression
};
