'use strict';

const fs = require('fs');
const randomString = require('randomstring');
const childProcess = require('child_process');
const isMac = require('../utils/misc.js').isMac;
const makeBoundTimedCollector = require('./queue');
const searchConfig = require('./searchConfig');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');
const { launchAgent, launchDaemon, taskScheduler } = require('./utils/search-launchd.js');

const libSymphonySearch = require('./searchLibrary');
const Crypto = require('../cryptoLib');

const INDEX_VALIDATOR = searchConfig.LIBRARY_CONSTANTS.INDEX_VALIDATOR;

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
        this.userId = userId;
        this.key = key;
        this.indexFolderName = `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME_PATH}_${this.userId}`;
        this.dataFolder = searchConfig.FOLDERS_CONSTANTS.INDEX_PATH;
        this.realTimeIndex = searchConfig.FOLDERS_CONSTANTS.TEMP_REAL_TIME_INDEX;
        this.batchIndex = searchConfig.FOLDERS_CONSTANTS.TEMP_BATCH_INDEX_FOLDER;
        this.messageData = [];
        this.isRealTimeIndexing = false;
        this.crypto = new Crypto(userId, key);
        this.decryptAndInit();
        this.collector = makeBoundTimedCollector(this.checkIsRealTimeIndexing.bind(this),
            searchConfig.REAL_TIME_INDEXING_TIME, this.realTimeIndexing.bind(this));
    }

    /**
     * Decrypting the existing user .enc file
     * and initialing the library
     */
    decryptAndInit() {
        this.crypto.decryption().then(() => {
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
        Search.deleteIndexFolders(this.realTimeIndex);
        Search.deleteIndexFolders(this.batchIndex);
        Search.indexValidator(this.indexFolderName);
        Search.indexValidator(this.realTimeIndex);
        let indexDateStartFrom = new Date().getTime() - searchConfig.SEARCH_PERIOD_SUBTRACTOR;
        // Deleting all the messages except 3 Months from now
        libSymphonySearch.symSEDeleteMessages(this.indexFolderName, null,
            searchConfig.MINIMUM_DATE, indexDateStartFrom.toString());
        this.isInitialized = true;
        initializeLaunchAgent();
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
                log.send(logLevels.ERROR, 'Batch Indexing: Messages not provided');
                reject(new Error('Batch Indexing: Messages are required'));
                return;
            }

            try {
                let msg = JSON.parse(messages);
                if (!(msg instanceof Array)) {
                    log.send(logLevels.ERROR, 'Batch Indexing: Messages must be an array');
                    reject(new Error('Batch Indexing: Messages must be an array'));
                    return;
                }
            } catch(e) {
                log.send(logLevels.ERROR, 'Batch Indexing: parse error -> ' + e);
                reject(new Error(e));
                return;
            }

            if (!this.isInitialized) {
                log.send(logLevels.ERROR, 'Library not initialized');
                reject(new Error('Library not initialized'));
                return;
            }

            if (!fs.existsSync(this.dataFolder)) {
                log.send(logLevels.ERROR, 'User index folder not found');
                reject(new Error('User index folder not found'));
                return;
            }

            const indexId = randomString.generate(searchConfig.BATCH_RANDOM_INDEX_PATH_LENGTH);
            libSymphonySearch.symSECreatePartialIndexAsync(this.batchIndex, indexId, messages, (err, res) => {
                if (err) {
                    log.send(logLevels.ERROR, 'Batch Indexing: error ->' + err);
                    reject(new Error(err));
                    return;
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

            if (!fs.existsSync(this.dataFolder)) {
                log.send(logLevels.ERROR, 'User index folder not found');
                reject(new Error('User index folder not found'));
                return;
            }

            libSymphonySearch.symSEMergePartialIndexAsync(this.indexFolderName, this.batchIndex, (err, res) => {
                if (err) {
                    log.send(logLevels.ERROR, 'Error merging the index ->' + err);
                    reject(new Error(err));
                    return;
                }
                Search.deleteIndexFolders(this.batchIndex);
                resolve(res);
            });
        });
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
     * @param message
     */
    realTimeIndexing(message) {

        try {
            let msg = JSON.parse(message);
            if (!(msg instanceof Array)) {
                log.send(logLevels.ERROR, 'RealTime Indexing: Messages must be an array real-time indexing');
                return (new Error('RealTime Indexing: Messages must be an array'));
            }
        } catch(e) {
            log.send(logLevels.ERROR, 'RealTime Indexing: parse error -> ' + e);
            throw (new Error(e));
        }

        if (!this.isInitialized) {
            log.send(logLevels.ERROR, 'Library not initialized');
            throw new Error('Library not initialized');
        }

        if (!fs.existsSync(this.dataFolder)) {
            log.send(logLevels.ERROR, 'User index folder not found');
            throw new Error('User index folder not found');
        }

        this.isRealTimeIndexing = true;
        return libSymphonySearch.symSEIndexRealTimeAsync(this.realTimeIndex, message, (err, result) => {
            this.isRealTimeIndexing = false;
            if (err) {
                log.send(logLevels.ERROR, 'RealTime Indexing: error -> ' + err);
                throw new Error(err);
            }
            return result;
        });
    }

    /**
     * Encrypting the index after the merging the index
     * to the main user index
     */
    encryptIndex(key) {
        return this.crypto.encryption(key);
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
                log.send(logLevels.ERROR, 'Library not initialized');
                reject(new Error('Library not initialized'));
                return;
            }

            if (!fs.existsSync(this.indexFolderName) || !fs.existsSync(this.realTimeIndex)) {
                log.send(logLevels.ERROR, 'Index folder does not exist.');
                reject(new Error('Index folder does not exist.'));
                return;
            }

            let q = Search.constructQuery(query, senderIds, threadIds, fileType);

            if (q === undefined) {
                reject(new Error('Search query error'));
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
                log.send(logLevels.ERROR, 'Library not initialized');
                reject(new Error('Not initialized'));
                return;
            }

            if (!fs.existsSync(this.indexFolderName)) {
                log.send(logLevels.ERROR, 'Index folder does not exist.');
                reject(new Error('Index folder does not exist.'));
                return;
            }

            libSymphonySearch.symSEGetLastMessageTimestampAsync(this.indexFolderName, (err, res) => {
                if (err) {
                    log.send(logLevels.ERROR, 'Error getting the index timestamp ->' + err);
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

    deleteRealTimeFolder() {
        Search.deleteIndexFolders(this.realTimeIndex);
        Search.indexValidator(this.realTimeIndex);
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
            log.send(logLevels.ERROR, 'Unable validate index folder');
            return new Error('Unable validate index folder')
        } catch (err) {
            throw new Error(err);
        }
    }

    /**
     * Removing all the folders and files inside the data folder
     * @param location
     */
    static deleteIndexFolders(location) {
        if (fs.existsSync(location)) {
            fs.readdirSync(location).forEach((file) => {
                let curPath = location + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    Search.deleteIndexFolders(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(location);
        }
    }

}

/**
 * Deleting the data index folder
 * when the app is closed/signed-out/navigates
 */
function deleteIndexFolder() {
    Search.deleteIndexFolders(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH);
}

/**
 * Creating launch agent for handling the deletion of
 * index data folder when app crashed or on boot up
 */
function initializeLaunchAgent() {
    if (isMac) {
        let pidValue = process.pid;
        createLaunchScript(pidValue, 'clear-data', searchConfig.LIBRARY_CONSTANTS.LAUNCH_AGENT_FILE, function (res) {
            if (!res) {
                log.send(logLevels.ERROR, `Launch Agent not created`);
            }
            createLaunchScript(null, 'clear-data-boot', searchConfig.LIBRARY_CONSTANTS.LAUNCH_DAEMON_FILE, function (result) {
                if (!result) {
                    log.send(logLevels.ERROR, `Launch Agent not created`);
                }
                launchDaemon(`${searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH}/.symphony/clear-data-boot${searchConfig.LIBRARY_CONSTANTS.EXT}`, function (data) {
                    if (data) {
                        log.send(logLevels.INFO, 'Launch Daemon: Creating successful');
                    }
                });
            });

            launchAgent(pidValue, `${searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH}/.symphony/clear-data${searchConfig.LIBRARY_CONSTANTS.EXT}`, function (response) {
                if (response) {
                    log.send(logLevels.INFO, 'Launch Agent: Creating successful');
                }
            });
        });
    } else {
        folderPath = isDevEnv ? path.join(__dirname, '..', '..', searchConfig.FOLDERS_CONSTANTS.INDEX_FOLDER_NAME) :
            path.join(searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH, searchConfig.FOLDERS_CONSTANTS.INDEX_FOLDER_NAME);
        taskScheduler(`${searchConfig.LIBRARY_CONSTANTS.WINDOWS_TASK_FILE}`, folderPath);
    }
}

/**
 * Passing the pid of the application and creating the
 * bash file in the userData folder
 * @param pid
 * @param name
 * @param scriptPath
 * @param cb
 */
function createLaunchScript(pid, name, scriptPath, cb) {

    if (!fs.existsSync(`${searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH}/.symphony/`)) {
        fs.mkdirSync(`${searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH}/.symphony/`);
    }

    fs.readFile(scriptPath, 'utf8', function (err, data) {
        if (err) {
            log.send(logLevels.ERROR, `Error reading sh file: ${err}`);
            cb(false);
            return;
        }
        let result = data;
        result = result.replace(/dataPath/g, `"${searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH}/${searchConfig.FOLDERS_CONSTANTS.INDEX_FOLDER_NAME}"`);
        result = result.replace(/scriptPath/g, `${searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH}/.symphony/${name}${searchConfig.LIBRARY_CONSTANTS.EXT}`);
        if (pid) {
            result = result.replace(/SymphonyPID/g, `${pid}`);
        }

        fs.writeFile(`${searchConfig.FOLDERS_CONSTANTS.USER_DATA_PATH}/.symphony/${name}${searchConfig.LIBRARY_CONSTANTS.EXT}`, result, 'utf8', function (error) {
            if (error) {
                log.send(logLevels.ERROR, `Error writing sh file: ${error}`);
                return cb(false);
            }
            return cb(true);
        });
    });
}

/**
 * Exporting the search library
 * @type {{Search: Search}}
 */
module.exports = {
    Search: Search,
    deleteIndexFolder: deleteIndexFolder
};
