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
        this.userId = userId;
        this.key = key;
    }

    /**
     * Compressing the user index folder and
     * encrypting it
     * @returns {Promise}
     */
    encryption(key) {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(`${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME_PATH}_${this.userId}`)){
                log.send(logLevels.ERROR, 'Crypto: User index folder not found');
                reject();
                return;
            }

            lz4.compression(`${searchConfig.FOLDERS_CONSTANTS.INDEX_FOLDER_NAME}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`,
                `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`, (error, response) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'Crypto: Error while compressing to lz4: ' + error);
                        reject(error);
                        return;
                    }

                    if (response && response.stderr) {
                        log.send(logLevels.WARN, 'Crypto: Child process stderr while compression, ' + response.stderr);
                    }
                    const input = fs.createReadStream(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`);
                    const outputEncryption = fs.createWriteStream(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}.enc`);
                    let config = {
                        key: key
                    };
                    let encrypt;
                    try {
                        encrypt = crypto.encrypt(config);
                    } catch (e) {
                        log.send(logLevels.ERROR, 'Error encrypting : ' + e);
                        if (fs.existsSync(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`)) {
                            fs.unlinkSync(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`);
                        }
                        reject();
                        return;
                    }

                    let encryptionProcess = input.pipe(encrypt).pipe(outputEncryption);

                    encryptionProcess.on('finish', (err) => {
                        if (err) {
                            log.send(logLevels.ERROR, 'Crypto: Error while encrypting the compressed file: ' + err);
                            if (fs.existsSync(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`)) {
                                fs.unlinkSync(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`);
                            }
                            reject(new Error(err));
                            return;
                        }
                        if (fs.existsSync(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`)) {
                            fs.unlinkSync(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`);
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

            if (!fs.existsSync(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}.enc`)){
                log.send(logLevels.ERROR, 'Crypto: Encrypted file not found');
                reject();
                return;
            }

            const input = fs.createReadStream(`${DUMP_PATH}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}.enc`);
            const output = fs.createWriteStream(`${DUMP_PATH}/decrypted${searchConfig.TAR_LZ4_EXT}`);
            let config = {
                key: this.key
            };
            let decrypt;
            try {
                decrypt = crypto.decrypt(config);
            } catch (e) {
                log.send(logLevels.ERROR, 'Error decrypting : ' + e);
                if (fs.existsSync(`${DUMP_PATH}/decrypted${searchConfig.TAR_LZ4_EXT}`)) {
                    fs.unlinkSync(`${DUMP_PATH}/decrypted${searchConfig.TAR_LZ4_EXT}`);
                }
                reject();
                return;
            }

            let decryptionProcess = input.pipe(decrypt).pipe(output);

            decryptionProcess.on('finish', () => {

                if (!fs.existsSync(`${DUMP_PATH}/decrypted${searchConfig.TAR_LZ4_EXT}`)){
                    log.send(logLevels.ERROR, 'decrypted.tar.lz4 file not found');
                    reject();
                    return;
                }

                lz4.deCompression(`${DUMP_PATH}/decrypted${searchConfig.TAR_LZ4_EXT}`,(error, response) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'Crypto: Error while deCompression, ' + error);
                        // no return, need to unlink if error
                    }

                    if (response && response.stderr) {
                        log.send(logLevels.WARN, 'Crypto: Child process stderr while deCompression, ' + response.stderr);
                    }
                    fs.unlink(`${DUMP_PATH}/decrypted${searchConfig.TAR_LZ4_EXT}`, () => {
                        resolve('success');
                    });
                })
            });
        });
    }
}

module.exports = Crypto;