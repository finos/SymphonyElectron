'use strict';
const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const zipArchive = archiver('zip');
const extract = require('extract-zip');
const isDevEnv = require('../utils/misc.js').isDevEnv;
const crypto = require('./crypto');

const userData = path.join(app.getPath('userData'));
const INDEX_DATA_FOLDER = isDevEnv ? './data' : path.join(userData, 'data');
const TEMPORARY_PATH = isDevEnv ? path.join(__dirname, '..', '..') : userData;

class Crypto {

    constructor() {
        this.indexDataFolder = INDEX_DATA_FOLDER;
        this.dump = TEMPORARY_PATH;
        this.key = "XrwVgWR4czB1a9scwvgRUNbXiN3W0oWq7oUBenyq7bo="; // temporary only
        this.encryptedIndex = 'encryptedIndex.enc';
        this.zipErrored = false;
    }

    /**
     * Creates a zip of the data folder and encrypting
     * removing the data folder and the dump files
     * @returns {Promise}
     */
    encryption() {
        return new Promise((resolve, reject) => {

            let output = fs.createWriteStream(`${this.dump}/content.zip`);

            output.on('close', () => {

                const input = fs.createReadStream(`${this.dump}/content.zip`);
                const outputEncryption = fs.createWriteStream(this.encryptedIndex);
                let config = {
                    key: this.key
                };
                const encrypt = crypto.encrypt(config);

                input.pipe(encrypt).pipe(outputEncryption).on('finish', (err, res) => {
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

    /**
     * Decrypting the .enc file and unzipping
     * removing the .enc file and the dump files
     * @returns {Promise}
     */
    decryption() {
        return new Promise((resolve, reject) => {
            const input = fs.createReadStream(this.encryptedIndex);
            const output = fs.createWriteStream(`${this.dump}/decrypted.zip`);
            let config = {
                key: this.key
            };
            const decrypt = crypto.decrypt(config);

            input.pipe(decrypt).pipe(output).on('finish', () => {
                let readStream = fs.createReadStream(`${this.dump}/decrypted.zip`);
                readStream
                    .on('data', (data) => {
                        if (!data) {
                            reject(new Error("error reading zip"));
                        }
                        zip();
                    })
                    .on('error', (error) => {
                        reject(new Error(error.message));
                    });
            });

            let zip = () => {
                extract(`${this.dump}/decrypted.zip`, {dir: TEMPORARY_PATH}, (err) => {
                    if (err) {
                        reject(new Error(err));
                    }
                    fs.unlink(`${this.dump}/decrypted.zip`, () => {
                        fs.unlink(this.encryptedIndex, () => {
                            resolve('success');
                        })
                    });
                })
            }
        });
    }

    /**
     * Removing all the folders and files inside the data folder
     * @param {String} location
     * @returns {Promise}
     */
    static deleteFolderRecursive(location) {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(location)) {
                fs.readdirSync(location).forEach((file) => {
                    let curPath = location + "/" + file;
                    if (fs.lstatSync(curPath).isDirectory()) {
                        Crypto.deleteFolderRecursive(curPath);
                    } else {
                        fs.unlinkSync(curPath);
                    }
                });
                resolve(fs.rmdirSync(location));
            } else {
                reject('no file');
            }
        });
    }
}

module.exports = Crypto;