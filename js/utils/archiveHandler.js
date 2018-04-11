'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const mmm = require('mmmagic');
const Magic = mmm.Magic;
const magic = new Magic(mmm.MAGIC_MIME_TYPE);

/**
 * Archives files in the source directory
 * that matches the given file extension
 *
 * @param source {String} source path
 * @param destination {String} destination path
 * @param fileExtensions {Array} array of file ext
 * @return {Promise<any>}
 */
function generateArchiveForDirectory(source, destination, fileExtensions) {
    
    return new Promise((resolve, reject) => {

        let output = fs.createWriteStream(destination);
        let archive = archiver('zip', {zlib: {level: 9}});

        output.on('close', function () {
            resolve();
        });
    
        archive.on('error', function(err){
            reject(err);
        });
        
        archive.pipe(output);

        let files = fs.readdirSync(source);

        let filtered = files.filter((file) => fileExtensions.indexOf(path.extname(file)) !== -1);
        mapMimeType(filtered, source)
            .then((mappedData) => {
                if (mappedData.length > 0) {
                    mappedData.map((data) => {
                        switch (data.mimeType) {
                            case 'text/plain':
                                if (path.extname(data.file) === '.txt') {
                                    archive.file(source + '/' + data.file, { name: 'crashes/' + data.file });
                                } else {
                                    archive.file(source + '/' + data.file, { name: 'logs/' + data.file });
                                }
                                break;
                            case 'application/x-dmp':
                                archive.file(source + '/' + data.file, { name: 'crashes/' + data.file });
                                break;
                            default:
                                break;
                        }
                    });
                }
                archive.finalize();
            })
            .catch((err) => {
                log.send(logLevels.ERROR, 'Failed to find mime type. Error is ->  ' + err);
            });

    });
    
}

function mapMimeType(files, source) {
    return Promise.all(files.map((file) => {
        return new Promise((resolve, reject) => {
            return magic.detectFile(source + '/' + file, (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve({file: file, mimeType: result});
            });
        });
    }))
        .then((data) => data)
        .catch((err) => log.send(logLevels.ERROR, 'Failed to find mime type. Error is ->  ' + err));
}

module.exports = {
    generateArchiveForDirectory: generateArchiveForDirectory
};