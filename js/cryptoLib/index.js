'use strict';
const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const zipArchive = archiver('zip');
const extract = require('extract-zip');
const isDevEnv = require('../utils/misc.js').isDevEnv;

const userData = path.join(app.getPath('userData'));
const INDEX_DATA_FOLDER = isDevEnv ? './msgsjson' : path.join(userData, 'data');

class Crypto {

    constructor() {
        this.indexDataFolder = INDEX_DATA_FOLDER;
        this.decipher = crypto.createDecipher('aes256', 'temp');
        this.cipher = crypto.createCipher('aes256', "temp");
        this.dump = path.join(__dirname, '..', '..');
        this.encryptedIndex = 'encryptedIndex.enc';
        this.zipErrored = false;
    }

    encryption() {
        let self = this;
        return new Promise(function (resolve, reject) {

            let output = fs.createWriteStream(`${self.dump}/content.zip`);

            output.on('close', function () {

                const input = fs.createReadStream(`${self.dump}/content.zip`);
                const outPutEncryption = fs.createWriteStream(self.encryptedIndex);

                input.pipe(self.cipher).pipe(outPutEncryption).on('finish', function (err, res) {
                    if (err) {
                        reject(new Error(err));
                    }
                    if (!self.zipErrored) {
                        fs.unlinkSync(`${self.dump}/content.zip`);
                        Crypto.deleteFolderRecursive(self.indexDataFolder)
                            .then(function () {
                                resolve(res);
                            })
                            .catch(function (error) {
                                console.log(error)
                            });
                    }
                });
            });

            zipArchive.pipe(output);

            zipArchive.directory(self.indexDataFolder, true);

            zipArchive.finalize(function (err) {
                if (err) {
                    self.zipErrored = true;
                    reject(new Error(err));
                }
            });
        });
    }

    decryption() {
        let self = this;
        return new Promise(function (resolve, reject) {

            const input = fs.createReadStream(self.encryptedIndex);
            const output = fs.createWriteStream(`${self.dump}/decrypted.zip`);

            function unzip() {
                let temp = path.join(__dirname, '..', '..');
                extract(`${self.dump}/decrypted.zip`, {dir: temp}, function (err) {
                    if (err) reject(err);
                    fs.unlink(`${self.dump}/decrypted.zip`, function () {
                        resolve('success')
                    });
                })
            }

            input.pipe(self.decipher).pipe(output).on('finish', function () {
                var readStream = fs.createReadStream(`${self.dump}/decrypted.zip`);
                readStream
                    .on('data', function (data) {
                        if (!data) reject("error reading zip");
                        unzip();
                    })
                    .on('error', function (error) {
                        console.log('Error:', error.message);
                    });
            });
        });
    }

    static deleteFolderRecursive(pt) {
        return new Promise(function (resolve, reject) {
            if (fs.existsSync(pt)) {
                fs.readdirSync(pt).forEach(function (file) {
                    var curPath = pt + "/" + file;
                    if (fs.lstatSync(curPath).isDirectory()) {
                        Crypto.deleteFolderRecursive(curPath);
                    } else {
                        fs.unlinkSync(curPath);
                    }
                });
                resolve(fs.rmdirSync(pt));
            } else {
                reject('no file');
            }
        });
    }
}

module.exports = Crypto;