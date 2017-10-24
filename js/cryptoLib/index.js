'use strict';
const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');
const lz4 = require('../compressionLib');
const isDevEnv = require('../utils/misc.js').isDevEnv;
const crypto = require('./crypto');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

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
     * Compressing the user index folder and
     * encrypting it
     * @returns {Promise}
     */
    encryption() {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(this.indexDataFolder)){
                log.send(logLevels.ERROR, 'user index folder not found');
                reject();
                return;
            }

            lz4.compression(`data/${this.permanentIndexFolderName}`, `${this.permanentIndexFolderName}`, (error, response) => {
                if (error) {
                    log.send(logLevels.ERROR, 'lz4 compression error: ' + error);
                    reject(error);
                    return;
                }

                log.send(logLevels.WARN, 'compression stderr, ' + response.stderr);
                const input = fs.createReadStream(`${this.dump}/${this.permanentIndexFolderName}.tar.lz4`);
                const outputEncryption = fs.createWriteStream(this.encryptedIndex);
                let config = {
                    key: this.key
                };
                const encrypt = crypto.encrypt(config);

                let encryptionProcess = input.pipe(encrypt).pipe(outputEncryption);

                encryptionProcess.on('finish', (err) => {
                    if (err) {
                        log.send(logLevels.ERROR, 'encryption error: ' + err);
                        reject(new Error(err));
                        return;
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
                log.send(logLevels.ERROR, 'encrypted file not found');
                reject();
                return;
            }

            const input = fs.createReadStream(this.encryptedIndex);
            const output = fs.createWriteStream(`${this.dump}/decrypted.tar.lz4`);
            let config = {
                key: this.key
            };
            const decrypt = crypto.decrypt(config);

            let decryptionProcess = input.pipe(decrypt).pipe(output);

            decryptionProcess.on('finish', () => {

                if (!fs.existsSync(`${this.dump}/decrypted.tar.lz4`)){
                    log.send(logLevels.ERROR, 'decrypted.tar.lz4 file not found');
                    reject();
                    return;
                }

                lz4.deCompression(`${this.dump}/decrypted.tar.lz4`,(error, response) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'lz4 deCompression error, ' + error);
                        // no return, need to unlink if error
                    }

                    log.send(logLevels.WARN, 'deCompression stderr, ' + response.stderr);
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