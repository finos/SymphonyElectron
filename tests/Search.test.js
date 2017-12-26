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
    let realTimeIndexPath;
    let tempBatchPath;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 900000;

    beforeAll(function (done) {
        /*childProcess.exec(`npm rebuild --target=${process.version} --build-from-source`, function(err) {
            userId = 12345678910112;
            key = 'abcdefghijklmnopqrstuvwxyz123456789!@#$%^&*=';
            executionPath = path.join(__dirname, 'library');
            userConfigDir = path.join(__dirname, '..');
            searchConfig = require('../js/search/searchConfig.js');
            const { Search } = require('../js/search/search.js');
            SearchApi = new Search(userId, key);
            realTimeIndexPath = path.join(userConfigDir, 'data', 'temp_realtime_index');
            tempBatchPath = path.join(userConfigDir, 'data', 'temp_batch_indexes');
            done();
        });*/
        userId = 12345678910112;
        key = 'jjjehdnctsjyieoalskcjdhsnahsadndfnusdfsdfsd=';
        executionPath = path.join(__dirname, 'library');
        userConfigDir = path.join(__dirname, '..');
        searchConfig = require('../js/search/searchConfig.js');
        const { Search } = require('../js/search/search.js');
        SearchApi = new Search(userId, key);
        realTimeIndexPath = path.join(userConfigDir, 'data', 'temp_realtime_index');
        tempBatchPath = path.join(userConfigDir, 'data', 'temp_batch_indexes');
        done();
    });

    afterAll(function (done) {
        setTimeout(() => {
            let dataPath = path.join(searchConfig.FOLDERS_CONSTANTS.EXEC_PATH, '..', 'data');
            deleteIndexFolders(dataPath);
            let root = path.join(searchConfig.FOLDERS_CONSTANTS.EXEC_PATH, '..', `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${userId}_${searchConfig.INDEX_VERSION}.enc`);
            if (fs.existsSync(root)) {
                fs.unlink(root);
            }
            done();
        }, 3000);
    });

    function deleteIndexFolders(location) {
        if (fs.existsSync(location)) {
            fs.readdirSync(location).forEach((file) => {
                let curPath = location + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteIndexFolders(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(location);
        }
    }

    describe('Search Initial checks', function() {

        it('should be initialized', function () {
            expect(SearchApi.isInitialized).toBe(true);
            expect(SearchApi.indexFolderName).toBe(`${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME_PATH}_${userId}_${searchConfig.INDEX_VERSION}`);
            expect(SearchApi.dataFolder).toBe(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH);
            expect(SearchApi.realTimeIndex).toBe(searchConfig.FOLDERS_CONSTANTS.TEMP_REAL_TIME_INDEX);
            expect(SearchApi.batchIndex).toBe(searchConfig.FOLDERS_CONSTANTS.TEMP_BATCH_INDEX_FOLDER);
            expect(SearchApi.messageData).toEqual([]);
            expect(SearchApi.isRealTimeIndexing).toBe(false);
        });

        it('should isLibInit to true', function () {
            let init = SearchApi.isLibInit();
            expect(init).toEqual(true);
        });

        it('should isLibInit to true', function () {
            SearchApi.isInitialized = false;
            let init = SearchApi.isLibInit();
            expect(init).toEqual(false);
            SearchApi.isInitialized = true;
        });

        it('should exist index folder', function() {
            expect(fs.existsSync(path.join(userConfigDir, 'data', 'search_index_12345678910112_v1'))).toBe(true);
            expect(fs.existsSync(realTimeIndexPath)).toBe(true);
        });

        it('should not exist index folder', function() {
            expect(fs.existsSync(tempBatchPath)).toBe(false);
        });

    });

    describe('Batch indexing process tests', function () {

        it('should index in a batch', function (done) {
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
                expect(fs.existsSync(tempBatchPath)).toBe(true);
                done();
            });
        });

        it('should not batch index', function (done) {
            SearchApi.indexBatch().catch(function (err) {
                expect(err).toBeTruthy();
                done();
            });
        });

        it('should not batch index invalid object', function (done) {
            SearchApi.indexBatch('message').catch(function (err) {
                expect(err).toBeTruthy();
                done();
            });
        });

        it('should not batch index parse error', function (done) {
            let message = {
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: "1510684200000",
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "it works"
            };
            SearchApi.indexBatch(JSON.stringify(message)).catch(function (err) {
                expect(err).toBeTruthy();
                done();
            });
        });

        it('should not batch index isInitialized', function (done) {
            SearchApi.isInitialized = false;
            let message = [{
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: "1510684200000",
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "it fails"
            }];
            SearchApi.indexBatch(JSON.stringify(message)).catch(function (err) {
                expect(err).toBeTruthy();
                SearchApi.isInitialized = true;
                done();
            });
        });

        it('should match messages length after batch indexing', function (done) {
            SearchApi.searchQuery('it works', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(0);
                done()
            });
        });

        it('should merge batch index to user index', function (done) {
            SearchApi.mergeIndexBatches().then(function () {
                expect(fs.existsSync(tempBatchPath)).toBe(false);
                done();
            });
        });

        it('should match messages length after batch indexing', function (done) {
            SearchApi.searchQuery('it works', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(1);
                done();
            });
        });
    });

    describe('RealTime indexing process', function () {

        it('should index realTime message', function () {
            let message = [{
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: "1510684200000",
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "realtime working"
            }];
            const batchRealTimeIndexing = jest.spyOn(SearchApi, 'batchRealTimeIndexing');
            SearchApi.batchRealTimeIndexing(message);
            expect(batchRealTimeIndexing).toHaveBeenCalled();
        });

        it('should match message length', function (done) {
            SearchApi.searchQuery('realtime working', ["71811853189212"], ["Au8O2xKHyX1LtE6zW019GX///rZYegAtdA=="], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(1);
                expect(fs.existsSync(realTimeIndexPath)).toBe(true);
                done();
            })
        });

        it('should not index realTime message', function (done) {
            let message = [{
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: "1510684200000",
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "isRealTimeIndexing"
            }];
            const batchRealTimeIndexing = jest.spyOn(SearchApi, 'batchRealTimeIndexing');
            SearchApi.isRealTimeIndexing = false;
            SearchApi.batchRealTimeIndexing(message);
            expect(batchRealTimeIndexing).toHaveBeenCalled();
            SearchApi.searchQuery('isRealTimeIndexing', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(0);
                expect(fs.existsSync(realTimeIndexPath)).toBe(true);
                done();
            });
        });

        it('should not realTime index invalid object', function () {
            let message = [{
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: "1510684200000",
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "isRealTimeIndexing"
            }];

            expect(function () {
                SearchApi.realTimeIndexing('message')
            }).toThrow();

            expect(function () {
                SearchApi.realTimeIndexing()
            }).toThrow(new Error('RealTime Indexing: Messages is required'));

            SearchApi.isInitialized = false;
            expect(function () {
                SearchApi.realTimeIndexing(JSON.stringify(message))
            }).toThrow(new Error('Library not initialized'));
            SearchApi.isInitialized = true;
        });

        it('should return realTime bool', function () {
            SearchApi.isRealTimeIndexing = true;
            expect(SearchApi.checkIsRealTimeIndexing()).toBe(true);
            SearchApi.isRealTimeIndexing = false;
            expect(SearchApi.checkIsRealTimeIndexing()).toBe(false);
        });

        it('should delete realtime index', function () {
            SearchApi.deleteRealTimeFolder();
            expect(fs.existsSync(realTimeIndexPath)).toBe(true);
        });
    });


    describe('Test for encryption of the index', function () {

        it('should encrypt the user index', function (done) {
            SearchApi.encryptIndex(key);
            done();
        });

        it('should exist encrypted file', function (done) {
            setTimeout(function () {
                expect(fs.existsSync(path.join(userConfigDir, 'search_index_12345678910112_v1.enc'))).toBe(true);
                expect(fs.existsSync(path.join(userConfigDir, 'search_index_12345678910112_v1.tar.lz4'))).toBe(false);
                done();
            },1000);
        });
    });

    describe('Test for latest timestamp', function () {

        it('should get the latest timestamp', function (done) {
            SearchApi.getLatestMessageTimestamp().then(function (res) {
                expect(res).toEqual('1510684200000');
                done();
            });
        });

        it('should not get the latest timestamp', function (done) {
            SearchApi.isInitialized = false;
            SearchApi.getLatestMessageTimestamp().catch(function (err) {
                expect(err).toEqual('Not initialized');
                SearchApi.isInitialized = true;
                done();
            });
        });
    });

    describe('Test to decrypt the index', function () {

        it('should decrypt the index', function () {
            let dataPath = path.join(searchConfig.FOLDERS_CONSTANTS.EXEC_PATH, '..', 'data');
            deleteIndexFolders(dataPath);
            SearchApi.decryptAndInit();
        });

        it('should get message from the decrypted index', function (done) {
            setTimeout(function () {
                SearchApi.searchQuery('it works', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                    expect(res.messages.length).toEqual(1);
                    done()
                });
            }, 3000)
        });
    });

    describe('Test for search functions', function () {

    })
});