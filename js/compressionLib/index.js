const child = require('child_process');
const isMac = require('../utils/misc.js').isMac;

function compression(pathToFolder, outputPath, cb) {
    if (isMac) {
        child.exec(`tar cvf - ${pathToFolder} | lz4 > ${outputPath}.tar.lz4`, (error, stdout) => {
            if (error) {
                return cb(new Error(error));
            }
            return cb(null, stdout);
        })
    } else {
        child.exec(`tar.exe -cvf - ${pathToFolder} | lz4.exe > ${outputPath}.tar.lz4`, (error, stdout) => {
            if (error) {
                return cb(new Error(error));
            }
            return cb(null, stdout);
        })
    }
}

function deCompression(path, cb) {
    if (isMac) {
        child.exec(`lz4 -d ${path} | tar -xf -`, (error, stdout) => {
            if (error) {
                return cb(new Error(error));
            }
            return cb(null, stdout);
        })
    } else {
        child.exec(`lz4.exe -d ${path} | tar.exe xf -`, (error, stdout) => {
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
