'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

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
            log.send(logLevels.INFO, `Successfully archived the files`);
            resolve();
        });
    
        archive.on('error', function(err){
            log.send(logLevels.INFO, `Error archiving ${JSON.stringify(err)}`);
            reject(err);
        });
        
        archive.pipe(output);

        let files = fs.readdirSync(source);
        files
            .filter((file) => fileExtensions.indexOf(path.extname(file)) !== -1)
            .forEach((file) => {
                switch (path.extname(file)) {
                    case '.log':
                        archive.file(source + '/' + file, { name: 'logs/' + file });
                        break;
                    case '.dmp':
                    case '.txt': // on Windows .txt files will be created as part of crash dump
                        archive.file(source + '/' + file, { name: 'crashes/' + file });
                        break;
                    default:
                        break;
                }
            });

        archive.finalize();
    });
    
}

module.exports = {
    generateArchiveForDirectory: generateArchiveForDirectory
};