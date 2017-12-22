const electron = require('./__mocks__/electron');
const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');

const { isMac } = require('../js/utils/misc.js');

let executionPath = null;
let userConfigDir = null;

let searchConfig;
let SearchApi;

jest.mock('electron', function() {
    return {
        app: {
            getPath: mockedGetPath
        }
    }
});

function mockedGetPath(type) {
    if (type === 'exe') {
        return executionPath;
    }

    if (type === 'userData') {
        return userConfigDir
    }
    return '';
}

describe('Tests for Search', function() {

    let userId;
    let key;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 900000;

    beforeAll(function (done) {
        childProcess.exec(`npm rebuild --target=${process.version} --build-from-source`, function(err) {
            userId = 12345678910112;
            key = 'abcdefghijklmnopqrstuvwxyz123456789!@#$%^&*=';
            executionPath = path.join(__dirname, 'library');
            userConfigDir = path.join(__dirname, '..');
            searchConfig = require('../js/search/searchConfig.js');
            const { Search } = require('../js/search/search.js');
            SearchApi = new Search(userId, key);
            done();
        });
    });

    describe('Search Initial checks', function() {

        it('Should be initialized', function () {
            expect(SearchApi.isInitialized).toBe(true);
            expect(SearchApi.indexFolderName).toBe(`${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME_PATH}_${userId}_${searchConfig.INDEX_VERSION}`);
            expect(SearchApi.dataFolder).toBe(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH);
            expect(SearchApi.realTimeIndex).toBe(searchConfig.FOLDERS_CONSTANTS.TEMP_REAL_TIME_INDEX);
            expect(SearchApi.batchIndex).toBe(searchConfig.FOLDERS_CONSTANTS.TEMP_BATCH_INDEX_FOLDER);
            expect(SearchApi.messageData).toEqual([]);
            expect(SearchApi.isRealTimeIndexing).toBe(false);
        });

        it('Should exist index folder', function() {
            expect(fs.existsSync(path.join(userConfigDir, 'data', 'search_index_12345678910112_v1'))).toBe(true);
            expect(fs.existsSync(path.join(userConfigDir, 'data', 'temp_realtime_index'))).toBe(true);
        });

        it('Should not exist index folder', function() {
            expect(fs.existsSync(path.join(userConfigDir, 'data', 'temp_batch_indexes'))).toBe(false);
        });

        it('Should index in a batch', function () {
            let messages = [
                {
                    messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                    threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                    ingestionDate: "1510684200000",
                    senderId: "71811853189212",
                    chatType: "CHATROOM",
                    isPublic: "false",
                    sendingApp: "lc",
                    text: "it works"
                }
            ];
            SearchApi.indexBatch(JSON.stringify(messages)).then(function () {
                expect(fs.existsSync(path.join(userConfigDir, 'data', 'temp_batch_indexes'))).toBe(true);
            });
        });

        it('Should not batch index', function () {

            SearchApi.indexBatch().catch(function (err) {
                expect(err).toThrow(err);
            });

            let message = {
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: "1510684200000",
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "it fails"
            };
            SearchApi.indexBatch(JSON.stringify(message)).catch(function (err) {
                expect(err).toThrow(err);
            });

            SearchApi.isInitialized = false;
            SearchApi.indexBatch(JSON.stringify(message)).catch(function (err) {
                expect(err).toThrow(err);
            });
            SearchApi.isInitialized = true;
        });

        it('Should match messages length after batch indexing', function () {
            SearchApi.searchQuery('', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(0);
            });
        });

        it('Should merge batch index to user index', function () {
            SearchApi.mergeIndexBatches().then(function () {
                expect(fs.existsSync(path.join(userConfigDir, 'data', 'temp_batch_indexes'))).toBe(false);
            });
        });

        it('Should match messages length after batch indexing', function () {
            SearchApi.searchQuery('', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(2);
            });
        });

    });
});