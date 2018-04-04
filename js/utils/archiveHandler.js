'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function generateArchiveForDirectory(source, destination) {
    
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
        files.forEach((file) => {
            if (path.extname(file) === '.log') {
                archive.file(source + '/' + file, { name: 'logs/' + file });
            }
        });
        
        archive.finalize();
        
    });
    
}

module.exports = {
    generateArchiveForDirectory: generateArchiveForDirectory
};