'use strict';

const fs = require('fs');
const randomString = require('randomstring');

const libSymphonySearch = require('./searchLibrary');
const TEMP_BATCH_INDEX_FOLDER = './data/temp_batch_indexes';
const TEMP_REALTIME_INDEX = './data/temp_realtime_index';
const INDEX_PREFIX = './data/search_index';
const INDEX_DATA_FOLDER = './data';
const SEARCH_PERIOD_SUBTRACTOR = 3 * 31 * 24 * 60 * 60 * 1000;//3 months
const MINIMUM_DATE = '0000000000000';
const MAXIMUM_DATE = '9999999999999';
const INDEX_VERSION = 'v1';

const SORT_BY_SCORE = 0;

const BATCH_RANDOM_INDEX_PATH_LENGTH = 20;

class Search {

    constructor(userId) {
        this.isInitialized = false;
        this.userId = userId;
        this.startIndexingFromDate = (new Date().getTime() - SEARCH_PERIOD_SUBTRACTOR).toString();
        this.indexFolderName = INDEX_PREFIX + '_' + userId + '_' + INDEX_VERSION;
        this.init();
    }

    initLib() {
        return new Promise((resolve, reject) => {
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

        libSymphonySearch.symSEEnsureIndexExists(this.indexFolderName);
        libSymphonySearch.symSEEnsureIndexExists(TEMP_REALTIME_INDEX);
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
                resolve(res)
            });
        });
    }

    mergeIndexBatches() {
        libSymphonySearch.symSEMergePartialIndexAsync(this.indexFolderName, TEMP_BATCH_INDEX_FOLDER, function (err, res) {
            if (err) throw err;

            libSymphonySearch.symSERemoveFolder(TEMP_BATCH_INDEX_FOLDER);
        });
    }

    readJson() {
        return new Promise((resolve, reject) => {
            var files = fs.readdirSync('./msgsjson');
            let messageData = [];
            files.forEach(function (file) {
                let data = fs.readFileSync('./msgsjson/' + file, "utf8");
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
            if (!isNaN(startDate)) {
                if (startDate >= sd) {
                    sd = startDate;
                }
            }

            let sd_str = sd.toString();
            let ed_str = MAXIMUM_DATE;
            if (!isNaN(endDate)) {
                ed_str = endDate.toString();
            }

            if (isNaN(limit)) {
                limit = 25;
            }

            if (isNaN(offset)) {
                offset = 0
            }

            if (isNaN(sortOrder)) {
                sortOrder = SORT_BY_SCORE;
            }

            let returnedResult = libSymphonySearch.symSESearch(this.indexFolderName, TEMP_REALTIME_INDEX, q, sd_str, ed_str, offset, limit, sortOrder);
            let ret = JSON.parse(returnedResult);
            resolve(ret);
        });
    }

    static constructQuery(query, senderIds, threadIds, attachments) {
        return query;
    }

}

module.exports = {
    Search: Search
};