'use strict';

const fs = require('fs');
const randomString = require('randomstring');
const electron = require('electron');
const childProcess = require('child_process');
const app = electron.app;
const path = require('path');
const isDevEnv = require('../utils/misc.js').isDevEnv;
const isMac = require('../utils/misc.js').isMac;

// Search library
const libSymphonySearch = require('./searchLibrary');

// Crypto Library
const Crypto = require('../cryptoLib');

// Path for the exec file and the user data folder
const userData = path.join(app.getPath('userData'));
const execPath = path.dirname(app.getPath('exe'));

// Constants paths for temp indexing folders
const TEMP_BATCH_INDEX_FOLDER = isDevEnv ? './data/temp_batch_indexes' : path.join(userData, 'data/temp_batch_indexes');
const TEMP_REAL_TIME_INDEX = isDevEnv ? './data/temp_realtime_index' : path.join(userData, 'data/temp_realtime_index');
// Main User Index path
const INDEX_PREFIX = isDevEnv ? './data/search_index' : path.join(userData, 'data/search_index');
// Folder contains real time, batch and user index
const INDEX_DATA_FOLDER = isDevEnv ? './data' : path.join(userData, 'data');
//3 Months
const SEARCH_PERIOD_SUBTRACTOR = 3 * 31 * 24 * 60 * 60 * 1000;
const MINIMUM_DATE = '0000000000000';
const MAXIMUM_DATE = '9999999999999';
const INDEX_VERSION = 'v1';

const SORT_BY_SCORE = 0;
const BATCH_RANDOM_INDEX_PATH_LENGTH = 20;

// library path contractor
const winArchPath = process.arch === 'ia32' ? 'library/indexvalidator-x86.exe' : 'library/indexvalidator-x64.exe';
const rootPath = isMac ? 'library/indexvalidator.exec' : winArchPath;
const productionPath = path.join(execPath, isMac ? '..' : '', rootPath);
const devPath = path.join(__dirname, '..', '..', rootPath);
const INDEX_VALIDATOR = isDevEnv ? devPath : productionPath;

/**
 * This search class communicates with the SymphonySearchEngine C library via node-ffi.
 * There should be only 1 instance of this class in the Electron
 */
class Search {

    /**
     * Constructor for the SymphonySearchEngine library
     * @param userId (for the index folder name)
     * @param key
     */
    constructor(userId, key) {
        console.time('Decrypting');
        this.isInitialized = false;
        this.userId = userId;
        this.key = key;
        this.indexFolderName = INDEX_PREFIX + '_' + this.userId + '_' + INDEX_VERSION;
        this.dataFolder = INDEX_DATA_FOLDER;
        this.realTimeIndex = TEMP_REAL_TIME_INDEX;
        this.batchIndex = TEMP_BATCH_INDEX_FOLDER;
        this.messageData = [];
        this.crypto = new Crypto(userId, key);
        this.decryptAndInit();
    }

    /**
     * Decrypting the existing user .enc file
     * and initialing the library
     */
    decryptAndInit() {
        this.crypto.decryption().then(() => {
            console.timeEnd('Decrypting');
            this.init();
        }).catch(() => {
            this.init();
        });
    }

    /**
     * returns isInitialized boolean
     * @returns {boolean}
     */
    isLibInit() {
        return this.isInitialized;
    }

    /**
     * This init function
     * initialise the SymphonySearchEngine library
     * and creates a folder in the userData
     */
    init() {
        libSymphonySearch.symSEInit();
        libSymphonySearch.symSEEnsureFolderExists(this.dataFolder);
        libSymphonySearch.symSERemoveFolder(this.realTimeIndex);
        libSymphonySearch.symSERemoveFolder(this.batchIndex);
        Search.indexValidator(this.indexFolderName);
        Search.indexValidator(this.realTimeIndex);
        let indexDateStartFrom = new Date().getTime() - SEARCH_PERIOD_SUBTRACTOR;
        // Deleting all the messages except 3 Months from now
        libSymphonySearch.symSEDeleteMessages(this.indexFolderName, null,
            MINIMUM_DATE, indexDateStartFrom.toString());
        this.isInitialized = true;
    }

    /**
     * An array of messages is passed for indexing
     * it will be indexed in a temporary index folder
     * @param {Array} messages
     * @returns {Promise}
     */
    indexBatch(messages) {
        return new Promise((resolve, reject) => {
            if (!messages) {
                reject(new Error('Messages is required'));
                return;
            }

            if (!(JSON.parse(messages) instanceof Array)) {
                reject(new Error('Messages must be an array'));
                return;
            }

            if (!this.isInitialized) {
                reject(new Error('Library not initialized'));
                return;
            }

            const indexId = randomString.generate(BATCH_RANDOM_INDEX_PATH_LENGTH);
            libSymphonySearch.symSECreatePartialIndexAsync(this.batchIndex, indexId, messages, (err, res) => {
                if (err) {
                    reject(new Error(err));
                }
                resolve(res);
            });
        });
    }

    /**
     * Merging the temporary
     * created from indexBatch()
     */
    mergeIndexBatches() {
        return new Promise((resolve, reject) => {
            libSymphonySearch.symSEMergePartialIndexAsync(this.indexFolderName, this.batchIndex, (err, res) => {
                if (err) {
                    reject(new Error(err));
                }
                libSymphonySearch.symSERemoveFolder(this.batchIndex);
                resolve(res);
            });
        });
    }

    /**
     * An array of messages to be indexed
     * in real time
     * @param message
     */
    realTimeIndexing(message) {
        if (!message) {
            return new Error('Message is required');
        }

        if (!(JSON.parse(message) instanceof Array)){
            return new Error('Message must be an array');
        }

        if (!this.isInitialized) {
            return new Error('Library not initialized');
        }

        let result = libSymphonySearch.symSEIndexRealTime(this.realTimeIndex, message);
        return result === 0 ? "Successful" : result
    }

    /**
     * Reading a json file
     * for the demo search app only
     * @param {String} batch
     * @returns {Promise}
     */
    readJson(batch) {
        return new Promise((resolve, reject) => {
            let dirPath = path.join(execPath, isMac ? '..' : '', 'msgsjson', batch);
            let messageFolderPath = isDevEnv ? path.join('./msgsjson', batch) : dirPath;
            let files = fs.readdirSync(messageFolderPath);
            this.messageData = [];
            files.forEach((file) => {
                let tempPath = path.join(messageFolderPath, file);
                let data = fs.readFileSync(tempPath, "utf8");
                if (data) {
                    try {
                        this.messageData.push(JSON.parse(data));
                    } catch (err) {
                        reject(new Error(err))
                    }
                } else {
                    reject(new Error('Error reading batch'))
                }
            });
            resolve(this.messageData);
        });
    }

    /**
     * Encrypting the index after the merging the index
     * to the main user index
     */
    encryptIndex() {
        return this.crypto.encryption().then(() => {
            return 'Success'
        }).catch((e) => {
            return (new Error(e));
        });
    }

    /**
     * This returns the search results
     * which returns a char *
     * @param {String} query
     * @param {Array} senderIds
     * @param {Array} threadIds
     * @param {String} fileType
     * @param {String} startDate
     * @param {String} endDate
     * @param {Number} limit
     * @param {Number} offset
     * @param {Number} sortOrder
     * @returns {Promise}
     */
    searchQuery(query, senderIds, threadIds, fileType, startDate,
                endDate, limit, offset, sortOrder) {

        let _limit = limit;
        let _offset = offset;
        let _sortOrder = sortOrder;

        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(new Error('Library not initialized'));
                return;
            }

            if (!fs.existsSync(this.indexFolderName) || !fs.existsSync(this.realTimeIndex)) {
                reject('Index folder does not exist.');
                return;
            }

            let q = Search.constructQuery(query, senderIds, threadIds, fileType);

            if (q === undefined) {
                reject(new Error('Search query error'));
                return;
            }

            let searchPeriod = new Date().getTime() - SEARCH_PERIOD_SUBTRACTOR;
            let startDateTime = searchPeriod;
            if (startDate) {
                startDateTime = new Date(parseInt(startDate, 10)).getTime();
                if (!startDateTime || startDateTime < searchPeriod) {
                    startDateTime = searchPeriod;
                }
            }

            let endDateTime = MAXIMUM_DATE;
            if (endDate) {
                let eTime = new Date(parseInt(endDate, 10)).getTime();
                if (eTime) {
                    endDateTime = eTime;
                }
            }

            if (!_limit && _limit === "" && typeof _limit !== 'number' && Math.round(_limit) !== _limit) {
                _limit = 25;
            }

            if (!_offset && _offset === "" && typeof _offset !== 'number' && Math.round(_offset) !== _offset) {
                _offset = 0
            }

            if (!_sortOrder && _sortOrder === "" && typeof _sortOrder !== 'number' && Math.round(_sortOrder) !== _sortOrder) {
                _sortOrder = SORT_BY_SCORE;
            }

            const returnedResult = libSymphonySearch.symSESearch(this.indexFolderName, this.realTimeIndex, q, startDateTime.toString(), endDateTime.toString(), _offset, _limit, _sortOrder);
            try {
                let ret = returnedResult.readCString();
                resolve(JSON.parse(ret));
            } finally {
                libSymphonySearch.symSEFreeResult(returnedResult);
            }
        });
    }

    /**
     * returns the latest message timestamp
     * from the indexed data
     * @returns {Promise}
     */
    getLatestMessageTimestamp() {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject('Not initialized');
                return;
            }

            if (!fs.existsSync(this.indexFolderName)) {
                reject('Index folder does not exist.');
                return;
            }

            libSymphonySearch.symSEGetLastMessageTimestampAsync(this.indexFolderName, (err, res) => {
                if (err) {
                    reject(new Error(err));
                }
                const returnedResult = res;
                try {
                    let ret = returnedResult.readCString();
                    resolve(ret);
                } finally {
                    libSymphonySearch.symSEFreeResult(returnedResult);
                }
            });
        });
    }

    /**
     * This the query constructor
     * for the search function
     * @param {String} searchQuery
     * @param {Array} senderId
     * @param {Array} threadId
     * @param {String} fileType
     * @returns {string}
     */
    static constructQuery(searchQuery, senderId, threadId, fileType) {

        let searchText = "";
        if(searchQuery !== undefined) {
            searchText = searchQuery.trim().toLowerCase(); //to prevent injection of AND and ORs
        }
        let q = "";
        let hashTags = Search.getHashTags(searchText);
        let hashCashTagQuery = "";

        if(hashTags.length > 0) {
            hashCashTagQuery = " OR tags:(";
            hashTags.forEach((item) => {
                hashCashTagQuery = hashCashTagQuery + "\"" + item + "\" "
            });
            hashCashTagQuery += ")";
        }

        let hasAttachments = false;
        let additionalAttachmentQuery = "";
        if(fileType) {
            hasAttachments = true;
            if(fileType.toLowerCase() === "attachment") {
                additionalAttachmentQuery = "(hasfiles:true)";
            } else {
                additionalAttachmentQuery = "(filetype:(" + fileType +"))";
            }
        }


        if (searchText.length > 0 ) {
            q = "((text:(" + searchText + "))" + hashCashTagQuery ;
            if(hasAttachments) {
                q += " OR (filename:(" + searchText + "))" ;
            }
            q = q + ")";
        }

        q = Search.appendFilterQuery(q, "senderId", senderId);
        q = Search.appendFilterQuery(q, "threadId", threadId);

        if(q === "") {
            if(hasAttachments) {
                q = additionalAttachmentQuery;
            } else {
                q = undefined; //will be handled in the search function
            }
        } else {
            if(hasAttachments){
                q = q + " AND " + additionalAttachmentQuery
            }
        }
        return q;
    }

    /**
     * appending the senderId and threadId for the query
     * @param {String} searchText
     * @param {String} fieldName
     * @param {Array} valueArray
     * @returns {string}
     */
    static appendFilterQuery(searchText, fieldName, valueArray) {
        let q = "";
        if (valueArray && valueArray.length > 0 ) {

            q += "(" + fieldName +":(";
            valueArray.forEach((item)=>{
                q+= "\"" + item + "\" ";
            });
            q += "))";
            if(searchText.length > 0 ) {
                q = searchText + " AND " + q;
            }

        } else {
            q = searchText;
        }

        return q;
    }

    // hashtags can have any characters(before the latest release it was
    // not like this). So the only regex is splitting the search query based on
    // whitespaces
    /**
     * return the hash cash
     * tags from the query
     * @param {String} searchText
     * @returns {Array}
     */
    static getHashTags(searchText) {
        let hashTags = [];
        let tokens = searchText.toLowerCase()
            .trim()
            .replace(/\s\s+/g, ' ')
            .split(' ').filter((el) => {return el.length !== 0});
        tokens.forEach((item) => {
            if (item.startsWith('#') || item.startsWith('$')) {
                hashTags.push(item);
            }
        });
        return hashTags;
    }

    /**
     * Validate the index folder exist or not
     * @param {String} file
     * @returns {*}
     */
    static indexValidator(file) {
        let data;
        let result = childProcess.execFileSync(INDEX_VALIDATOR, [file]).toString();
        try {
            data = JSON.parse(result);
            if (data.status === 'OK') {
                return data;
            }
            return new Error('Unable validate index folder')
        } catch (err) {
            throw new Error(err);
        }
    }
}

/**
 * Exporting the search library
 * @type {{Search: Search}}
 */
module.exports = {
    Search: Search
};
