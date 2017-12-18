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
     * @param version
     */
    constructor(userId, key, version) {
        this.indexDataFolder = `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME_PATH}_${userId}`;
        this.permanentIndexName = `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${userId}`;
        this.dump = DUMP_PATH;
        this.key = key;
        this.version = version;
        this.encryptedIndex = `${DUMP_PATH}/${this.permanentIndexName}`;
        this.dataFolder = searchConfig.FOLDERS_CONSTANTS.INDEX_PATH;
    }

    /**
     * Compressing the user index folder and
     * encrypting it
     * @returns {Promise}
     */
    encryption(key, version) {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(`${this.indexDataFolder}_${version}`)){
                log.send(logLevels.ERROR, 'Crypto: User index folder not found');
                reject();
                return;
            }

            lz4.compression(`${searchConfig.FOLDERS_CONSTANTS.INDEX_FOLDER_NAME}/${this.permanentIndexName}_${version}`,
                `${this.permanentIndexName}_${version}`, (error, response) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'Crypto: Error while compressing to lz4: ' + error);
                        reject(error);
                        return;
                    }

                    if (response && response.stderr) {
                        log.send(logLevels.WARN, 'Crypto: Child process stderr while compression, ' + response.stderr);
                    }
                    const input = fs.createReadStream(`${this.dump}/${this.permanentIndexName}_${version}${searchConfig.TAR_LZ4_EXT}`);
                    const outputEncryption = fs.createWriteStream(`${this.encryptedIndex}_${version}.enc`);
                    let config = {
                        key: key
                    };
                    const encrypt = crypto.encrypt(config);

                    let encryptionProcess = input.pipe(encrypt).pipe(outputEncryption);

                    encryptionProcess.on('finish', (err) => {
                        if (err) {
                            log.send(logLevels.ERROR, 'Crypto: Error while encrypting the compressed file: ' + err);
                            reject(new Error(err));
                            return;
                        }
                        fs.unlinkSync(`${this.dump}/${this.permanentIndexName}_${version}${searchConfig.TAR_LZ4_EXT}`);
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

            if (!fs.existsSync(`${this.encryptedIndex}_${this.version}.enc`)){
                log.send(logLevels.ERROR, 'Crypto: Encrypted file not found');
                reject();
                return;
            }

            const input = fs.createReadStream(`${this.encryptedIndex}_${this.version}.enc`);
            const output = fs.createWriteStream(`${this.dump}/decrypted${searchConfig.TAR_LZ4_EXT}`);
            let config = {
                key: this.key
            };
            const decrypt = crypto.decrypt(config);

            let decryptionProcess = input.pipe(decrypt).pipe(output);

            decryptionProcess.on('finish', () => {

                if (!fs.existsSync(`${this.dump}/decrypted${searchConfig.TAR_LZ4_EXT}`)){
                    log.send(logLevels.ERROR, 'decrypted.tar.lz4 file not found');
                    reject();
                    return;
                }

                lz4.deCompression(`${this.dump}/decrypted${searchConfig.TAR_LZ4_EXT}`,(error, response) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'Crypto: Error while deCompression, ' + error);
                        // no return, need to unlink if error
                    }

                    if (response && response.stderr) {
                        log.send(logLevels.WARN, 'Crypto: Child process stderr while deCompression, ' + response.stderr);
                    }
                    fs.unlink(`${this.dump}/decrypted${searchConfig.TAR_LZ4_EXT}`, () => {
                        resolve('success');
                    });
                })
            });
        });
    }
}

module.exports = Crypto;