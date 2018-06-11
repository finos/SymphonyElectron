'use strict';

const fs = require('fs');
const ref = require('ref');
const path = require('path');
const makeBoundTimedCollector = require('./queue');
const searchConfig = require('./searchConfig');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const lz4 = require('../compressionLib');

const libSymphonySearch = require('./searchLibrary');

/*eslint class-methods-use-this: ["error", { "exceptMethods": ["deleteRealTimeFolder"] }] */
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
        this.isInitialized = false;
        this.messageData = [];
        this.userId = userId;
        this.isRealTimeIndexing = false;
        this.decompress(key);
        this.collector = makeBoundTimedCollector(this.checkIsRealTimeIndexing.bind(this),
            searchConfig.REAL_TIME_INDEXING_TIME, this.realTimeIndexing.bind(this));
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
    init(key) {
        if (!key) {
            return;
        }
        let bufKey = new Buffer(key, searchConfig.KEY_ENCODING);
        if (bufKey.length !== searchConfig.KEY_LENGTH) {
            return;
        }
        libSymphonySearch.symSEDestroy();
        libSymphonySearch.symSEInit();
        libSymphonySearch.symSEClearMainRAMIndex();
        libSymphonySearch.symSEClearRealtimeRAMIndex();
        this.isInitialized = true;
        const userIndexPath = path.join(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH,
            `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`);
        if (isFileExist.call(this, 'USER_INDEX_PATH')) {
            const mainIndexFolder = path.join(userIndexPath, searchConfig.FOLDERS_CONSTANTS.MAIN_INDEX);
            libSymphonySearch.symSEDeserializeMainIndexToEncryptedFoldersAsync(mainIndexFolder, key, (error, res) => {

                clearSearchData.call(this);
                if (res === undefined || res === null || res < 0) {
                    log.send(logLevels.ERROR, 'Deserialization of Main Index Failed-> ' + error);
                    return;
                }
                log.send(logLevels.INFO, 'Deserialization of Main Index Successful-> ' + res);
                let indexDateStartFrom = new Date().getTime() - searchConfig.SEARCH_PERIOD_SUBTRACTOR;
                // Deleting all the messages except 3 Months from now
                libSymphonySearch.symSEDeleteMessagesFromRAMIndex(null,
                    searchConfig.MINIMUM_DATE, indexDateStartFrom.toString());
            });
        }
    }

    decompress(key) {
        const userIndexPath = path.join(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH,
            `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`);
        if (isFileExist.call(this, 'LZ4')) {
            lz4.decompression(`${userIndexPath}${searchConfig.TAR_LZ4_EXT}`, (err) => {
                if (err && !isFileExist.call(this, 'USER_INDEX_PATH')) {
                    fs.mkdirSync(userIndexPath);
                }
                this.init(key);
            })
        } else {
            if (!isFileExist.call(this, 'USER_INDEX_PATH')) {
                fs.mkdirSync(userIndexPath);
            }
            this.init(key);
        }
    }

    /**
     * An array of messages is passed for indexing
     * it will be indexed in a temporary index folder
     * @param {Array} messages
     * @param callback
     */
    indexBatch(messages, callback) {
        if (typeof callback !== "function") {
            return false;
        }

        if (!messages) {
            log.send(logLevels.ERROR, 'Batch Indexing: Messages not provided');
            return callback(false, 'Batch Indexing: Messages are required');
        }

        try {
            let messagesData = JSON.parse(messages);
            if (!(messagesData instanceof Array)) {
                log.send(logLevels.ERROR, 'Batch Indexing: Messages must be an array');
                return callback(false, 'Batch Indexing: Messages must be an array');
            }
        } catch (e) {
            log.send(logLevels.ERROR, 'Batch Indexing: parse error -> ' + e);
            return callback(false, 'Batch Indexing parse error');
        }

        if (!this.isInitialized) {
            log.send(logLevels.ERROR, 'Library not initialized');
            return callback(false, 'Library not initialized');
        }

        libSymphonySearch.symSEIndexMainRAMAsync(messages, (err, res) => {
            if (err) {
                log.send(logLevels.ERROR, `IndexBatch: Error indexing messages to memory : ${err}`);
                return callback(false, 'IndexBatch: Error indexing messages to memory');
            }
            return callback(true, res);
        });

        return null;
    }

    /**
     * Batching the real time
     * messages for queue and flush
     * @param {Object} message
     */
    batchRealTimeIndexing(message) {
        this.collector(message);
    }

    /**
     * Returns the current state of the
     * real-time indexing
     * @returns {boolean}
     */
    checkIsRealTimeIndexing() {
        return this.isRealTimeIndexing;
    }

    /**
     * An array of messages to be indexed
     * in real time
     * @param messages
     * @param callback
     */
    realTimeIndexing(messages, callback) {
        if (typeof callback !== "function") {
            return false;
        }

        try {
            let messagesData = JSON.parse(messages);
            if (!(messagesData instanceof Array)) {
                return callback(false, 'RealTime Indexing: Messages must be an array');
            }
        } catch(e) {
            return callback(false, 'RealTime Indexing: parse error ');
        }

        if (!this.isInitialized) {
            return callback(false, 'Library not initialized');
        }

        this.isRealTimeIndexing = true;
        libSymphonySearch.symSEIndexRealtimeRAMAsync(messages, (err, result) => {
            this.isRealTimeIndexing = false;
            if (err) {
                return callback(false, 'RealTime Indexing: error');
            }
            return callback(true, result);
        });

        return null;
    }

    /**
     * Encrypting the index after the merging the index
     * to the main user index
     */
    encryptIndex(key) {
        const mainIndexFolder = path.join(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH,
            `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`);
        return new Promise(resolve => {
            if (!isFileExist.call(this, 'USER_INDEX_PATH')) {
                fs.mkdirSync(mainIndexFolder);
            }

            if (!this.isInitialized) {
                log.send(logLevels.ERROR, 'Library not initialized');
                return;
            }
            libSymphonySearch.symSESerializeMainIndexToEncryptedFoldersAsync(mainIndexFolder, key, (err, res) => {
                if (res === undefined || res === null || res < 0) {
                    log.send(logLevels.ERROR, 'Serializing Main Index Failed-> ' + err);
                    if (isFileExist.call(this, 'USER_INDEX_PATH')) {
                        clearSearchData.call(this);
                    }
                    return;
                }
                const userIndexPath = `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`;
                lz4.compression(userIndexPath, userIndexPath, (error) => {
                    if (error) {
                        log.send(logLevels.ERROR, 'Compressing Main Index Folder-> ' + err);
                    }
                    clearSearchData.call(this);
                });
                resolve();
            });
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

        return new Promise(resolve => {
            if (!this.isInitialized) {
                log.send(logLevels.ERROR, 'Library not initialized');
                resolve({
                    messages: [],
                    more: 0,
                    returned: 0,
                    total: 0,
                });
                return;
            }

            let q = Search.constructQuery(query, senderIds, threadIds, fileType);

            if (q === undefined) {
                resolve({
                    messages: [],
                    more: 0,
                    returned: 0,
                    total: 0,
                });
                return;
            }

            let searchPeriod = new Date().getTime() - searchConfig.SEARCH_PERIOD_SUBTRACTOR;
            let startDateTime = searchPeriod;
            if (startDate) {
                startDateTime = new Date(parseInt(startDate, 10)).getTime();
                if (!startDateTime || startDateTime < searchPeriod) {
                    startDateTime = searchPeriod;
                }
            }

            let endDateTime = searchConfig.MAXIMUM_DATE;
            if (endDate) {
                let eTime = new Date(parseInt(endDate, 10)).getTime();
                if (eTime) {
                    endDateTime = eTime;
                }
            }

            if (!_limit || _limit === "" || typeof _limit !== 'number' || Math.round(_limit) !== _limit) {
                _limit = 25;
            }

            if (!_offset || _offset === "" || typeof _offset !== 'number' || Math.round(_offset) !== _offset) {
                _offset = 0
            }

            if (!_sortOrder || _sortOrder === "" || typeof _sortOrder !== 'number' || Math.round(_sortOrder) !== _sortOrder) {
                _sortOrder = searchConfig.SORT_BY_SCORE;
            }

            const returnedResult = libSymphonySearch.symSERAMIndexSearch(q, startDateTime.toString(), endDateTime.toString(), _offset, _limit, _sortOrder);
            try {
                const ret = ref.readCString(returnedResult);
                resolve(JSON.parse(ret));
            } finally {
                libSymphonySearch.symSEFreeResult(returnedResult);
            }
        });
    }

    /**
     * returns the latest message timestamp
     * from the indexed data
     * @param callback
     */
    getLatestMessageTimestamp(callback) {
        if (typeof callback !== "function") {
            return false;
        }

        if (!this.isInitialized) {
            log.send(logLevels.ERROR, 'Library not initialized');
            return callback(false, 'Not initialized');
        }

        libSymphonySearch.symSEMainRAMIndexGetLastMessageTimestampAsync((err, res) => {
            if (err) {
                log.send(logLevels.ERROR, 'Error getting the index timestamp ->' + err);
                return callback(false, 'Error getting the index timestamp');
            }
            const returnedResult = res;
            try {
                const ret = ref.readCString(returnedResult);
                return callback(true, ret);
            } finally {
                libSymphonySearch.symSEFreeResult(returnedResult);
            }
        });

        return null;
    }

    /**
     * This function clears the real-time index
     * before starting the batch-indexing
     */
    deleteRealTimeFolder() {
        libSymphonySearch.symSEClearRealtimeRAMIndex();
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
        let textQuery = "";
        if(searchQuery !== undefined) {
            searchText = searchQuery.trim().toLowerCase(); //to prevent injection of AND and ORs
            textQuery = Search.getTextQuery(searchText);
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
            q = "((text:(" + textQuery + "))" + hashCashTagQuery ;
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
     * If the search query does not have double quotes (implying phrase search),
     * then create all tuples of the terms in the search query
     * @param {String} searchText
     * @returns {String}
     */

    static getTextQuery(searchText) {
        let s1 = searchText.trim().toLowerCase();
        //if contains quotes we assume it will be a phrase search
        if(searchText.indexOf("\"") !== -1 ) {
            return s1;
        }
        //else we will create tuples
        let s2 = s1.replace(/\s{2,}/g," ").trim();
        let tokens = s2.split(" ");

        let i,j = 0;
        let out = "";
        for(i = tokens.length; i > 0; i--) {// number of tokens in a tuple
            for(j = 0; j < tokens.length-i + 1 ; j++){ //start from index
                if(out !== ""){
                    out += " ";
                }
                out += Search.putTokensInRange(tokens, j, i);
            }
        }
        return out;
    }

    /**
    * Helper function for getTextQuery()
    * Given a list of tokens create a tuple given the start index of the
    * token list and given the number of tokens to create.
    * @param {Array} tokens
    * @param {Number} start
    * @param {Number} numTokens
    * @returns {String}
    */
    static putTokensInRange(tokens, start, numTokens) {
        let out = "\"";
        for(let i = 0; i < numTokens; i++) {
            if(i !== 0) {
                out += " ";
            }
            out+= tokens[start+i];
        }
        out += "\"";
        return out;
    }

}

function clearSearchData() {
    function removeFiles(filePath) {
        if (fs.existsSync(filePath)) {
            fs.readdirSync(filePath).forEach((file) => {
                let curPath = filePath + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    removeFiles(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(filePath);
        }
    }

    if (this.userId) {
        removeFiles(path.join(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH,
            `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`));
    }
}

/**
 * Check if the file or folder exist or not
 * @param type
 * @returns {boolean}
 */
function isFileExist(type) {
    let searchPath;

    if (!this.userId) {
        return false
    }

    const paths = {
        USER_INDEX_PATH: path.join(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH,
            `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}`),
        LZ4: path.join(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH,
            `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${this.userId}${searchConfig.TAR_LZ4_EXT}`),
    };

    searchPath = paths[type];

    return !!(searchPath && fs.existsSync(searchPath));
}

/**
 * Exporting the search library
 * @type {{Search: Search}}
 */
module.exports = {
    Search: Search
};
