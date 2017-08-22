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
const Cryotp = require('../cryptoLib');
const crypto = new Cryotp();

// Path for the exec file and the user data folder
const userData = path.join(app.getPath('userData'));
const execPath = path.dirname(app.getPath('exe'));

// Constants paths for temp indexing folders
const TEMP_BATCH_INDEX_FOLDER = isDevEnv ? './data/temp_batch_indexes' : path.join(userData, 'data/temp_batch_indexes');
const TEMP_REAL_TIME_INDEX = isDevEnv ? './data/temp_realtime_index' : path.join(userData, 'data/temp_realtime_index');
const INDEX_PREFIX = isDevEnv ? './data/search_index' : path.join(userData, 'data/search_index');
const INDEX_DATA_FOLDER = isDevEnv ? './data' : path.join(userData, 'data');
const SEARCH_PERIOD_SUBTRACTOR = 3 * 31 * 24 * 60 * 60 * 1000;//3 months
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
     */
    constructor(userId) {
        this.isInitialized = false;
        this.userId = 'user_data';
        // Will be handling this in SEARCH-206
        this.key = "XrwVgWR4czB1a9scwvgRUNbXiN3W0oWq7oUBenyq7bo="; // temporary only
        this.startIndexingFromDate = (new Date().getTime() - SEARCH_PERIOD_SUBTRACTOR).toString();
        this.indexFolderName = INDEX_PREFIX + '_' + userId + '_' + INDEX_VERSION;
        this.dataFolder = INDEX_DATA_FOLDER;
        this.realTimeIndex = TEMP_REAL_TIME_INDEX;
        this.batchIndex = TEMP_BATCH_INDEX_FOLDER;
        this.messageData = [];
        this.decryptAndInit();
    }

    decryptAndInit() {
        crypto.decryption(this.key).then(() => {
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
            if (!Array.isArray(messages)) {
                reject(new Error('Messages must be an array'));
                return;
            }

            if (!this.isInitialized) {
                reject(new Error('Library not initialized'));
                return;
            }

            const indexId = randomString.generate(BATCH_RANDOM_INDEX_PATH_LENGTH);
            libSymphonySearch.symSECreatePartialIndexAsync(this.batchIndex, indexId, JSON.stringify(messages), (err, res) => {
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
        libSymphonySearch.symSEMergePartialIndexAsync(this.indexFolderName, this.batchIndex, (err) => {
            if (err) {
                throw new Error(err);
            }
            libSymphonySearch.symSERemoveFolder(this.batchIndex)
        });
    }

    /**
     * An array of messages to be indexed
     * in real time
     * @param message
     */
    realTimeIndexing(message) {
        if (!Array.isArray(message)) {
            return new Error('Messages should be an array');
        }

        if (!this.isInitialized) {
            return new Error('Library not initialized');
        }

        let result = libSymphonySearch.symSEIndexRealTime(this.realTimeIndex, JSON.stringify(message));
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
     * This returns the search results
     * which returns a char *
     * @param {String} query
     * @param {Array} senderIds
     * @param {Array} threadIds
     * @param {String} attachments
     * @param {String} startDate
     * @param {String} endDate
     * @param {Number} limit
     * @param {Number} offset
     * @param {Number} sortOrder
     * @returns {Promise}
     */
    searchQuery(query, senderIds, threadIds, attachments, startDate,
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

            let q = Search.constructQuery(query, senderIds, threadIds);

            if (q === undefined) {
                reject(new Error('Search query error'));
                return;
            }

            let sd = new Date().getTime() - SEARCH_PERIOD_SUBTRACTOR;
            let sd_time = MINIMUM_DATE;
            if (startDate && startDate !== "" && typeof startDate === 'object') {
                sd_time = new Date(startDate).getTime();
                if (sd_time >= sd) {
                    sd_time = sd;
                }
            }

            let ed_time = MAXIMUM_DATE;
            if (endDate && endDate !== "" && typeof endDate === 'object') {
                ed_time = new Date(endDate).getTime();
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

            const returnedResult = libSymphonySearch.symSESearch(this.indexFolderName, this.realTimeIndex, q, sd_time.toString(), ed_time.toString(), _offset, _limit, _sortOrder);
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
     * @returns {string}
     */
    static constructQuery(searchQuery, senderId, threadId) {

        let query = "";
        if(searchQuery !== undefined) {
            query = searchQuery.trim().toLowerCase(); //to prevent injection of AND and ORs
        }
        let q = "";
        let hashTags = Search.getHashTags(query);
        let hashCashTagQuery = "";

        if(hashTags.length > 0) {
            hashCashTagQuery = " OR tags:(";
            hashTags.forEach((item) => {
                hashCashTagQuery = hashCashTagQuery + "\"" + item + "\" "
            });
            hashCashTagQuery += ")";
        }

        if (query.length > 0 ) {
            q = "(text:(" + query + ")" + hashCashTagQuery + ")";
        }

        q = Search.appendFilterQuery(q, "senderId", senderId);
        q = Search.appendFilterQuery(q, "threadId", threadId);

        if(q === "") {
            q = undefined; //will be handled in the search function
        }
        return q;
    }

    /**
     * appending the senderId and threadId for the query
     * @param {String} query
     * @param {String} fieldName
     * @param {Array} valueArray
     * @returns {string}
     */
    static appendFilterQuery(query, fieldName, valueArray) {
        let q = "";
        if (valueArray && valueArray.length > 0 ) {

            q += "(" + fieldName +":(";
            valueArray.forEach((item)=>{
                q+= "\"" + item + "\" ";
            });
            q += "))";
            if(query.length > 0 ) {
                q = query + " AND " + q;
            }

        } else {
            q = query;
        }

        return q;
    }

    // hashtags can have any characters(before the latest release it was
    // not like this). So the only regex is splitting the search query based on
    // whitespaces
    /**
     * return the hash cash
     * tags from the query
     * @param {String} query
     * @returns {Array}
     */
    static getHashTags(query) {
        let hashTags = [];
        let tokens = query.toLowerCase()
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
