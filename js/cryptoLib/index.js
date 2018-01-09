'use strict';
const path = require('path');
const fs = require('fs');
const lz4 = require('../compressionLib');
const isDevEnv = require('../utils/misc.js').isDevEnv;
const crypto = require('./crypto');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const searchConfig = require('../search/searchConfig.js');

const DUMP_PATH = isDevEnv ? path.join(__dirname, '..', '..') : searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH;

class Crypto {

    /**
     * Constructor
     * @param userId
     * @param key
     */
    constructor(userId, key) {
        this.indexDataFolder = `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME_PATH}_${userId}_${searchConfig.INDEX_VERSION}`;
        this.permanentIndexName = `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${userId}_${searchConfig.INDEX_VERSION}`;
        this.key = key;
        this.encryptedIndex = `${DUMP_PATH}/${this.permanentIndexName}.enc`;
        this.dataFolder = searchConfig.FOLDERS_CONSTANTS.INDEX_PATH;
        this.lz4Temp = `${DUMP_PATH}/${this.permanentIndexName}${searchConfig.TAR_LZ4_EXT}`;
        this.decryptedTemp = `${DUMP_PATH}/decrypted${searchConfig.TAR_LZ4_EXT}`;
    }

    /**
     * Compressing the user index folder and
     * encrypting it
     * @returns {Promise}
     */
    encryption(key) {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(this.indexDataFolder)){
                log.send(logLevels.ERROR, 'Crypto: User index folder not found');
                reject();
                return;
            }

            lz4.compression(`${searchConfig.FOLDERS_CONSTANTS.INDEX_FOLDER_NAME}/${this.permanentIndexName}`,
                `${this.permanentIndexName}`, (error, response) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'Crypto: Error while compressing to lz4: ' + error);
                        reject(error);
                        return;
                    }

                    if (response && response.stderr) {
                        log.send(logLevels.WARN, 'Crypto: Child process stderr while compression, ' + response.stderr);
                    }
                    const input = fs.createReadStream(this.lz4Temp);
                    const outputEncryption = fs.createWriteStream(this.encryptedIndex);
                    let config = {
                        key: key
                    };
                    let encrypt;
                    try {
                        encrypt = crypto.encrypt(config);
                    } catch (e) {
                        log.send(logLevels.ERROR, 'Error encrypting : ' + e);
                        if (fs.existsSync(this.lz4Temp)) {
                            fs.unlinkSync(this.lz4Temp);
                        }
                        reject();
                        return;
                    }

                    let encryptionProcess = input.pipe(encrypt).pipe(outputEncryption);

                    encryptionProcess.on('finish', (err) => {
                        if (err) {
                            log.send(logLevels.ERROR, 'Crypto: Error while encrypting the compressed file: ' + err);
                            if (fs.existsSync(this.lz4Temp)) {
                                fs.unlinkSync(this.lz4Temp);
                            }
                            reject(new Error(err));
                            return;
                        }
                        if (fs.existsSync(this.lz4Temp)) {
                            fs.unlinkSync(this.lz4Temp);
                        }
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
                log.send(logLevels.ERROR, 'Crypto: Encrypted file not found');
                reject();
                return;
            }

            const input = fs.createReadStream(this.encryptedIndex);
            const output = fs.createWriteStream(this.decryptedTemp);
            let config = {
                key: this.key
            };
            let decrypt;
            try {
                decrypt = crypto.decrypt(config);
            } catch (e) {
                log.send(logLevels.ERROR, 'Error decrypting : ' + e);
                if (fs.existsSync(this.decryptedTemp)) {
                    fs.unlinkSync(this.decryptedTemp);
                }
                reject();
                return;
            }

            let decryptionProcess = input.pipe(decrypt).pipe(output);

            decryptionProcess.on('finish', () => {

                if (!fs.existsSync(this.decryptedTemp)){
                    log.send(logLevels.ERROR, 'decrypted.tar.lz4 file not found');
                    reject();
                    return;
                }

                lz4.deCompression(this.decryptedTemp,(error, response) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'Crypto: Error while deCompression, ' + error);
                        // no return, need to unlink if error
                    }

                    if (response && response.stderr) {
                        log.send(logLevels.WARN, 'Crypto: Child process stderr while deCompression, ' + response.stderr);
                    }
                    fs.unlink(this.decryptedTemp, () => {
                        resolve('success');
                    });
                })
            });
        });
    }
}

module.exports = Crypto;