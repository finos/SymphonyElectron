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
const MODE = 'aes-256-ctr';

class Crypto {

    constructor() {
        this.indexDataFolder = INDEX_DATA_FOLDER;
        this.key = '53796d70686f6e792074657374206b657920666f7220656e6372797074696f6e20';
        this.dump = path.join(__dirname, '..', '..');
        this.encryptedIndex = 'encryptedIndex.enc';
        this.zipErrored = false;
    }

    encryption() {
        return new Promise((resolve, reject) => {

            let output = fs.createWriteStream(`${this.dump}/content.zip`);

            output.on('close', () => {

                const input = fs.createReadStream(`${this.dump}/content.zip`);
                const outputEncryption = fs.createWriteStream(this.encryptedIndex);
                const cipher = crypto.createCipher(MODE, this.key);

                input.pipe(cipher).pipe(outputEncryption).on('finish', (err, res) => {
                    if (err) {
                        reject(new Error(err));
                    }
                    if (!this.zipErrored) {
                        fs.unlinkSync(`${this.dump}/content.zip`);
                        Crypto.deleteFolderRecursive(this.indexDataFolder)
                            .then(function () {
                                resolve(res);
                            })
                            .catch(function (error) {
                                reject(new Error(error))
                            });
                    }
                });
            });

            zipArchive.pipe(output);

            zipArchive.directory(this.indexDataFolder, true);

            zipArchive.finalize((err) => {
                if (err) {
                    this.zipErrored = true;
                    reject(new Error(err));
                }
            });
        });
    }

    decryption() {
        return new Promise((resolve, reject) => {
            const input = fs.createReadStream(this.encryptedIndex);
            const output = fs.createWriteStream(`${this.dump}/decrypted.zip`);
            const deCipher = crypto.createDecipher(MODE, this.key);

            input.pipe(deCipher).pipe(output).on('finish', () => {
                let readStream = fs.createReadStream(`${this.dump}/decrypted.zip`);
                readStream
                    .on('data', (data) => {
                        if (!data) {
                            reject(new Error("error reading zip"));
                        }
                        unzip();
                    })
                    .on('error', (error) => {
                        reject(new Error(error.message));
                    });
            });

            let unzip = () => {
                let temp = path.join(__dirname, '..', '..');
                extract(`${this.dump}/decrypted.zip`, {dir: temp}, (err) => {
                    if (err) {
                        reject(new Error(err));
                    }
                    fs.unlink(`${this.dump}/decrypted.zip`, () => {
                        resolve('success')
                    });
                })
            };
        });
    }

    static deleteFolderRecursive(pt) {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(pt)) {
                fs.readdirSync(pt).forEach((file) => {
                    let curPath = pt + "/" + file;
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