const child = require('child_process');
const isMac = require('../utils/misc.js').isMac;
const electron = require('electron');
const app = electron.app;
const path = require('path');
const userData = path.join(app.getPath('userData'));
const isDevEnv = require('../utils/misc.js').isDevEnv;
const DATA_FOLDER_PATH = isDevEnv ? path.join(__dirname, '..', '..') : userData;

const execPath = path.dirname(app.getPath('exe'));

// library path contractor
const folderLibPath = 'library';
const productionPath = path.join(execPath, folderLibPath);
const devPath = path.join(__dirname, '..', '..', folderLibPath);

const libraryPath = isDevEnv ? devPath : productionPath;

function compression(pathToFolder, outputPath, cb) {
    if (isMac) {
        child.exec(`cd "${DATA_FOLDER_PATH}" && tar cvf - "${pathToFolder}" | lz4 > "${outputPath}.tar.lz4"`, (error, stdout) => {
            if (error) {
                return cb(new Error(error));
            }
            return cb(null, stdout);
        })
    } else {
        child.exec(`cd "${DATA_FOLDER_PATH}" && "${libraryPath}\\tar-win.exe" cvf - "${pathToFolder}" | "${libraryPath}\\lz4-win.exe" > "${outputPath}.tar.lz4"`, (error, stdout) => {
            if (error) {
                return cb(new Error(error));
            }
            return cb(null, stdout);
        })
    }
}

function deCompression(pathName, cb) {
    if (isMac) {
        child.exec(`cd "${DATA_FOLDER_PATH}" && lz4 -d "${pathName}" | tar -xf - `, (error, stdout) => {
            if (error) {
                return cb(new Error(error));
            }
            return cb(null, stdout);
        })
    } else {
        child.exec(`cd "${DATA_FOLDER_PATH}" && "${libraryPath}\\lz4-win.exe" -d "${pathName}" | "${libraryPath}\\tar-win.exe" xf - `, (error, stdout) => {
            if (error) {
                return cb(new Error(error));
            }
            return cb(null, stdout);
        })
    }
}

module.exports = {
    compression,
    deCompression
};
