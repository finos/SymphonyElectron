const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');

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
    let dataFolderPath;
    let realTimeIndexPath;
    let tempBatchPath;
    let currentDate = new Date().getTime();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90000;

    beforeAll(function (done) {
        childProcess.exec(`npm rebuild --target=${process.version} --build-from-source`, function(err) {
            userId = 12345678910112;
            key = 'jjjehdnctsjyieoalskcjdhsnahsadndfnusdfsdfsd=';
            executionPath = path.join(__dirname, 'library');
            userConfigDir = path.join(__dirname, '..');
            searchConfig = require('../js/search/searchConfig.js');
            const { Search } = require('../js/search/search.js');
            SearchApi = new Search(userId, key);
            realTimeIndexPath = path.join(userConfigDir, 'data', 'temp_realtime_index');
            tempBatchPath = path.join(userConfigDir, 'data', 'temp_batch_indexes');
            dataFolderPath = path.join(searchConfig.FOLDERS_CONSTANTS.EXEC_PATH, '..', 'data');
            done();
        });
    });

    afterAll(function (done) {
        setTimeout(() => {
            deleteIndexFolders(dataFolderPath);
            let root = path.join(searchConfig.FOLDERS_CONSTANTS.EXEC_PATH, '..', `${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${userId}_${searchConfig.INDEX_VERSION}.enc`);
            if (fs.existsSync(root)) {
                fs.unlinkSync(root);
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

        it('should be initialized', function (done) {
            setTimeout(function () {
                expect(SearchApi.isInitialized).toBe(true);
                expect(SearchApi.indexFolderName).toBe(`${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME_PATH}_${userId}_${searchConfig.INDEX_VERSION}`);
                expect(SearchApi.dataFolder).toBe(searchConfig.FOLDERS_CONSTANTS.INDEX_PATH);
                expect(SearchApi.realTimeIndex).toBe(searchConfig.FOLDERS_CONSTANTS.TEMP_REAL_TIME_INDEX);
                expect(SearchApi.batchIndex).toBe(searchConfig.FOLDERS_CONSTANTS.TEMP_BATCH_INDEX_FOLDER);
                expect(SearchApi.messageData).toEqual([]);
                expect(SearchApi.isRealTimeIndexing).toBe(false);
                done();
            }, 3000)
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
                    ingestionDate: currentDate.toString(),
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
                ingestionDate: currentDate.toString(),
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
                ingestionDate: currentDate.toString(),
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
                ingestionDate: currentDate.toString(),
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
                ingestionDate: currentDate.toString(),
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "isRealTimeIndexing"
            }];
            const batchRealTimeIndexing = jest.spyOn(SearchApi, 'batchRealTimeIndexing');
            SearchApi.isRealTimeIndexing = true;
            SearchApi.batchRealTimeIndexing(message);
            expect(batchRealTimeIndexing).toHaveBeenCalled();
            setTimeout(function () {
                SearchApi.searchQuery('isRealTimeIndexing', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                    expect(res.messages.length).toEqual(0);
                    expect(fs.existsSync(realTimeIndexPath)).toBe(true);
                    done();
                });
            }, 6000)
        });

        it('should not realTime index invalid object', function () {
            let message = [{
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: currentDate.toString(),
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
            }, 3000);
        });
    });

    describe('Test for latest timestamp', function () {

        it('should get the latest timestamp', function (done) {
            SearchApi.getLatestMessageTimestamp().then(function (res) {
                expect(res).toEqual(currentDate.toString());
                done();
            });
        });

        it('should not get the latest timestamp', function (done) {
            SearchApi.isInitialized = false;
            SearchApi.getLatestMessageTimestamp().catch(function (err) {
                expect(err).toEqual(new Error('Not initialized'));
                SearchApi.isInitialized = true;
                done();
            });
        });

        it('should not get the latest timestamp', function (done) {
            SearchApi.indexFolderName = '';
            SearchApi.getLatestMessageTimestamp().catch(function (err) {
                expect(err).toEqual(new Error('Index folder does not exist.'));
                SearchApi.indexFolderName = `${dataFolderPath}/${searchConfig.FOLDERS_CONSTANTS.PREFIX_NAME}_${userId}_${searchConfig.INDEX_VERSION}`;
                done();
            });
        });
    });

    describe('Test to decrypt the index', function () {

        it('should decrypt the index', function () {
            deleteIndexFolders(dataFolderPath);
            SearchApi.decryptAndInit();
        });

        it('should get message from the decrypted index', function (done) {
            setTimeout(function () {
                let endTime = new Date().getTime();
                let startTime = new Date().getTime() - (4 * 31 * 24 * 60 * 60 * 1000);
                SearchApi.searchQuery('it works', [], [], '', startTime.toString(), endTime.toString(), '0', 0.2, 0.1).then(function (res) {
                    expect(res.messages.length).toEqual(1);
                    done()
                });
            }, 3000)
        });
    });

    describe('Test for search functions', function () {

        it('should search fail isInitialized', function (done) {
            SearchApi.isInitialized = false;
            SearchApi.searchQuery('it works', [], [], '', '', '', 25, 0, 0).catch(function (err) {
                expect(err).toEqual(new Error('Library not initialized'));
                SearchApi.isInitialized = true;
                done();
            });
        });

        it('should search fails index folder not fund', function (done) {
            deleteIndexFolders(dataFolderPath);
            SearchApi.searchQuery('it works', [], [], '', '', '', 25, 0, 0).catch(function (err) {
                expect(err).toEqual(new Error('Index folder does not exist.'));
                SearchApi = undefined;
                const { Search } = require('../js/search/search.js');
                SearchApi = new Search(userId, key);
                done();
            });
        });

        it('should search fails query is undefined', function (done) {
            setTimeout(function () {
                expect(SearchApi.isInitialized).toBe(true);
                SearchApi.searchQuery(undefined, [], [], '', '', '', 25, 0, 0).catch(function (err) {
                    expect(err).toEqual(new Error('Search query error'));
                    done();
                });
            }, 3000);
        });

        it('should search for hashtag', function (done) {
            SearchApi.searchQuery('#123 "testing"', [], [], 'attachment', '', '', 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(0);
                done();
            });
        });

        it('should search for pdf', function (done) {
            SearchApi.searchQuery('', [], [], 'pdf', '', '', 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(0);
                done();
            });
        });
    });

});