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
const INDEX_DATA_FOLDER = isDevEnv ? './data/search_index' : path.join(userData, 'data/search_index');
const TEMPORARY_PATH = isDevEnv ? path.join(__dirname, '..', '..') : userData;

class Crypto {

    // TODO: Need to pass key for encryption and decryption
    constructor() {

        // will be handling after implementing in client app
        let userId = 'user_data';
        let INDEX_VERSION = 'v1';
        // will be handling after implementing in client app

        this.indexDataFolder = INDEX_DATA_FOLDER + '_' + userId + '_' + INDEX_VERSION;
        this.permanentIndexFolderName = 'search_index_' + userId + '_' + INDEX_VERSION;
        this.dump = TEMPORARY_PATH;
        this.extractToPath = `${TEMPORARY_PATH}/data/${this.permanentIndexFolderName}`;
        this.encryptedIndex = `${INDEX_DATA_FOLDER + '_' + userId + '_' + INDEX_VERSION}.enc`;
        this.zipErrored = false;
    }

    /**
     * Creates a zip of the data folder and encrypting
     * removing the data folder and the dump files
     * @returns {Promise}
     */
    encryption(key) {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(this.indexDataFolder)){
                // will be handling after implementing in client app
                reject();
                return;
            }

            let output = fs.createWriteStream(`${this.dump}/${this.permanentIndexFolderName}.zip`);


            zipArchive.on('end', () => {

                if (!fs.existsSync(`${this.dump}/${this.permanentIndexFolderName}.zip`)){
                    // will be handling after implementing in client app
                    reject();
                    return;
                }

                const input = fs.createReadStream(`${this.dump}/${this.permanentIndexFolderName}.zip`);
                const outputEncryption = fs.createWriteStream(this.encryptedIndex);
                let config = {
                    key: key
                };
                const encrypt = crypto.encrypt(config);

                input.pipe(encrypt).pipe(outputEncryption).on('finish', (err, res) => {
                    if (err) {
                        reject(new Error(err));
                    }
                    if (!this.zipErrored) {
                        fs.unlinkSync(`${this.dump}/${this.permanentIndexFolderName}.zip`);
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

            zipArchive.directory(this.indexDataFolder + '/', false);

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
    decryption(key) {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(this.encryptedIndex)){
                // will be handling after implementing in client app
                reject();
                return;
            }

            const input = fs.createReadStream(this.encryptedIndex);
            const output = fs.createWriteStream(`${this.dump}/decrypted.zip`);
            let config = {
                key: key
            };
            const decrypt = crypto.decrypt(config);

            input.pipe(decrypt).pipe(output).on('finish', () => {

                if (!fs.existsSync(`${this.dump}/decrypted.zip`)){
                    // will be handling after implementing in client app
                    reject();
                    return;
                }

                let readStream = fs.createReadStream(`${this.dump}/decrypted.zip`);
                readStream
                    .on('data', (data) => {
                        if (!data) {
                            reject(new Error("error reading zip"));
                        }
                        extractZip();
                    })
                    .on('error', (error) => {
                        reject(new Error(error.message));
                    });
            });

            let extractZip = () => {
                extract(`${this.dump}/decrypted.zip`, {dir: `${this.extractToPath}`}, (err) => {
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