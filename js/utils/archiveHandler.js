'use strict';

const fs = require('fs');
const archiver = require('archiver');

function generateArchiveForDirectory(source, destination, callback) {
    
    let output = fs.createWriteStream(destination);
    let archive = archiver('zip');
    
    output.on('close', function () {
        return callback(null);
    });
    
    archive.on('error', function(err){
        return callback(err);
    });
    
    archive.pipe(output);
    archive.directory(source, 'logs/');
    archive.finalize();
    
}

module.exports = {
    generateArchiveForDirectory: generateArchiveForDirectory
};