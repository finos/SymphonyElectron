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

// Path for the exec file and the user data folder
let userData = path.join(app.getPath('userData'));
let execPath = path.dirname(app.getPath('exe'));

// Constants paths for temp indexing folders
const TEMP_BATCH_INDEX_FOLDER = isDevEnv ? './data/temp_batch_indexes' : path.join(userData, 'data/temp_batch_indexes');
const TEMP_REALTIME_INDEX = isDevEnv ? './data/temp_realtime_index' : path.join(userData, 'data/temp_realtime_index');
const INDEX_PREFIX = isDevEnv ? './data/search_index' : path.join(userData, 'data/search_index');
const INDEX_DATA_FOLDER = isDevEnv ? './data' : path.join(userData, 'data');
const SEARCH_PERIOD_SUBTRACTOR = 3 * 31 * 24 * 60 * 60 * 1000;//3 months
const MINIMUM_DATE = '0000000000000';
const MAXIMUM_DATE = '9999999999999';
const INDEX_VERSION = 'v1';

const rootPath = isMac ? 'indexvalidator.exec' : 'indexvalidator.exe';
let productionPath = path.join(execPath, isMac ? '..' : '', rootPath);
let devPath = path.join(__dirname, '..', '..', rootPath);
let libraryPath = isDevEnv ? devPath : productionPath;

let INDEX_VALIDATOR = libraryPath;

const SORT_BY_SCORE = 0;

const BATCH_RANDOM_INDEX_PATH_LENGTH = 20;

class Search {
    //TODO: fix eslint class-methods-use-this
    /*eslint-disable class-methods-use-this */

    constructor(userId) {
        this.isInitialized = false;
        this.userId = userId;
        this.startIndexingFromDate = (new Date().getTime() - SEARCH_PERIOD_SUBTRACTOR).toString();
        this.indexFolderName = INDEX_PREFIX + '_' + userId + '_' + INDEX_VERSION;
        this.init();
    }

    initLib() {
        return new Promise((resolve) => {
            if (!this.isInitialized) {
                this.isInitialized = true;
            }
            resolve(libSymphonySearch.symSEInit());
        });
    }

    isLibInit() {
        return this.initLib();
    }

    init() {
        libSymphonySearch.symSEInit();
        libSymphonySearch.symSEEnsureFolderExists(INDEX_DATA_FOLDER);
        libSymphonySearch.symSERemoveFolder(TEMP_REALTIME_INDEX);
        libSymphonySearch.symSERemoveFolder(TEMP_BATCH_INDEX_FOLDER);
        Search.indexValidator(this.indexFolderName);
        Search.indexValidator(TEMP_REALTIME_INDEX);
        let indexDateStartFrom = new Date().getTime() - SEARCH_PERIOD_SUBTRACTOR;
        libSymphonySearch.symSEDeleteMessages(this.indexFolderName, null,
            MINIMUM_DATE, indexDateStartFrom.toString());
        this.isInitialized = true;
    }

    indexBatch(messages) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject()
            }
            let indexId = randomString.generate(BATCH_RANDOM_INDEX_PATH_LENGTH);
            libSymphonySearch.symSECreatePartialIndexAsync(TEMP_BATCH_INDEX_FOLDER, indexId, JSON.stringify(messages), function (err, res) {
                if (err) reject(err);
                resolve(res);
            });
        });
    }

    mergeIndexBatches() {
        libSymphonySearch.symSEMergePartialIndexAsync(this.indexFolderName, TEMP_BATCH_INDEX_FOLDER, function (err) {
            if (err) throw err;
            libSymphonySearch.symSERemoveFolder(TEMP_BATCH_INDEX_FOLDER)
        });
    }

    realTimeIndexing(message) {
        libSymphonySearch.symSEIndexRealTime(TEMP_REALTIME_INDEX, JSON.stringify(message));
    }

    readJson(batch) {
        return new Promise((resolve, reject) => {
            let dirPath = path.join(execPath, isMac ? '..' : '', 'msgsjson', batch);
            let messageFolderPath = isDevEnv ? path.join('./msgsjson', batch) : dirPath;
            let files = fs.readdirSync(messageFolderPath);
            let messageData = [];
            files.forEach(function (file) {
                let tempPath = path.join(messageFolderPath, file);
                let data = fs.readFileSync(tempPath, "utf8");
                if (data) {
                    messageData.push(JSON.parse(data));
                    resolve(messageData);
                } else {
                    reject("err on reading files")
                }
            });
        });
    }

    query(query, senderIds, threadIds, attachments, startDate,
          endDate, limit, offset, sortOrder) {

        return new Promise((resolve, reject) => {
            if (!this.isInitialized) {
                reject(-1);
            }

            let q = Search.constructQuery(query, senderIds, threadIds, attachments);
            if (q === undefined) {
                reject(-2);
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

            //TODO: fix eslint no-param-reassign
            /*eslint-disable no-param-reassign */
            if (!limit && limit === "" && typeof limit !== 'number' && Math.round(limit) !== limit) {
                limit = 25;
            }

            if (!offset && offset === "" && typeof offset !== 'number' && Math.round(offset) !== offset) {
                offset = 0
            }

            if (!sortOrder && sortOrder === "" && typeof sortOrder !== 'number' && Math.round(sortOrder) !== sortOrder) {
                sortOrder = SORT_BY_SCORE;
            }

            const returnedResult = libSymphonySearch.symSESearch(this.indexFolderName, TEMP_REALTIME_INDEX, q, sd_time.toString(), ed_time.toString(), offset, limit, sortOrder);
            try {
                let ret = returnedResult.readCString();
                resolve(JSON.parse(ret));
            } finally {
                libSymphonySearch.symSEFreeResult(returnedResult);
            }
        });
    }

    static constructQuery(query, senderId, threadId) {
        let q = query;
        if (senderId && senderId !== "") {
            q += ` AND (senderId: ${senderId})`;
        }
        if (threadId && threadId !== "") {
            q += ` AND (threadId: ${threadId})`;
        }
        return q;
    }

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
            throw (err);
        }
    }
}

module.exports = {
    Search: Search
};