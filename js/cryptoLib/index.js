'use strict';
const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const lz4 = require('../compressionLib');
const isDevEnv = require('../utils/misc.js').isDevEnv;
const crypto = require('./crypto');

const userData = path.join(app.getPath('userData'));
const DATA_FOLDER = isDevEnv ? './data' : path.join(userData, 'data');
const INDEX_DATA_FOLDER = isDevEnv ? './data/search_index' : path.join(userData, 'data/search_index');
const TEMPORARY_PATH = isDevEnv ? path.join(__dirname, '..', '..') : userData;

class Crypto {

    constructor(userId, key) {
        let INDEX_VERSION = 'v1';
        this.indexDataFolder = INDEX_DATA_FOLDER + '_' + userId + '_' + INDEX_VERSION;
        this.permanentIndexFolderName = 'search_index_' + userId + '_' + INDEX_VERSION;
        this.dump = TEMPORARY_PATH;
        this.key = key;
        this.encryptedIndex = `${TEMPORARY_PATH}/${this.permanentIndexFolderName}.enc`;
        this.dataFolder = DATA_FOLDER;
    }

    /**
     * Creates a zip of the data folder and encrypting
     * removing the data folder and the dump files
     * @returns {Promise}
     */
    encryption() {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(this.indexDataFolder)){
                // will be handling after implementing in client app
                reject();
                return;
            }

            lz4.compression(`data/${this.permanentIndexFolderName}`, `${this.permanentIndexFolderName}`, (error) => {
                if (error) {
                    reject(error);
                }
                const input = fs.createReadStream(`${this.dump}/${this.permanentIndexFolderName}.tar.lz4`);
                const outputEncryption = fs.createWriteStream(this.encryptedIndex);
                let config = {
                    key: this.key
                };
                const encrypt = crypto.encrypt(config);

                input.pipe(encrypt).pipe(outputEncryption).on('finish', (err) => {
                    if (err) {
                        reject(new Error(err));
                    }
                    fs.unlinkSync(`${this.dump}/${this.permanentIndexFolderName}.tar.lz4`);
                    resolve('Success');
                });
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

            if (!fs.existsSync(this.encryptedIndex)){
                // will be handling after implementing in client app
                reject();
                return;
            }

            const input = fs.createReadStream(this.encryptedIndex);
            const output = fs.createWriteStream(`${this.dump}/decrypted.tar.lz4`);
            let config = {
                key: this.key
            };
            const decrypt = crypto.decrypt(config);

            input.pipe(decrypt).pipe(output).on('finish', () => {

                if (!fs.existsSync(`${this.dump}/decrypted.tar.lz4`)){
                    // will be handling after implementing in client app
                    reject();
                    return;
                }

                lz4.deCompression(`${this.dump}/decrypted.tar.lz4`,() => {
                    fs.unlink(`${this.dump}/decrypted.tar.lz4`, () => {
                        resolve('success');
                    });
                })
            });
        });
    }

    /**
     * Deleting the data index folder
     * when the app is closed
     */
    deleteFolders() {
        Crypto.deleteFolderRecursive(this.dataFolder);
    }

    /**
     * Removing all the folders and files inside the data folder
     * @param location
     */
    static deleteFolderRecursive(location) {
        if (fs.existsSync(location)) {
            fs.readdirSync(location).forEach((file) => {
                let curPath = location + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    Crypto.deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(location);
        }
    }
}

module.exports = Crypto;