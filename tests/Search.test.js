const path = require('path');
const fs = require('fs');
const { isWindowsOS } = require('../js/utils/misc.js');

let executionPath = null;
let userConfigDir = null;

let searchConfig;
let SearchApi;
let libSymphonySearch;

jest.mock('electron', function() {
    return {
        app: {
            getPath: mockedGetPath,
            getName: mockedGetName
        }
    }
});

function mockedGetName() {
    return 'Symphony';
}

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
    let currentDate = new Date().getTime();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    beforeAll(function (done) {
        userId = 12345678910112;
        key = 'jjjehdnctsjyieoalskcjdhsnahsadndfnusdfsdfsd=';

            executionPath = path.join(__dirname, 'library');
            if (isWindowsOS) {
                executionPath = path.join(__dirname, '..', 'library');
            }
            userConfigDir = path.join(__dirname, '..');
            libSymphonySearch = require('../js/search/searchLibrary.js');
            searchConfig = require('../js/search/searchConfig.js');
            if (fs.existsSync(path.join(userConfigDir, 'search_index_12345678910112.tar.lz4'))) {
                fs.unlink(path.join(userConfigDir, 'search_index_12345678910112.tar.lz4'));
            }
            if (fs.existsSync(path.join(userConfigDir, 'search_index_12345678910112'))) {
                deleteIndexFolders(path.join(userConfigDir, 'search_index_12345678910112'));
            }
            const { Search } = require('../js/search/search.js');
            SearchApi = new Search(userId, key);

            done();
    });

    afterAll(function (done) {
        setTimeout(function () {
            libSymphonySearch.symSEDestroy();
            if (fs.existsSync(path.join(userConfigDir, 'search_index_12345678910112.tar.lz4'))) {
                fs.unlink(path.join(userConfigDir, 'search_index_12345678910112.tar.lz4'));
            }

            if (fs.existsSync(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE)) {
                fs.unlinkSync(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE);
            }
            done();
        }, 3000);
    });

    function deleteIndexFolders(location) {
        if (fs.existsSync(location)) {
            fs.readdirSync(location).forEach(function(file) {
                let curPath = path.join(location, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteIndexFolders(curPath, true);
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
                expect(SearchApi.messageData).toEqual([]);
                expect(SearchApi.isRealTimeIndexing).toBe(false);

                done();
            }, 3000)
        });

        it('should isLibInit to true', function () {
            let init = SearchApi.isLibInit();
            expect(init).toEqual(true);
        });

        it('should isLibInit to false', function () {
            SearchApi.isInitialized = false;
            let init = SearchApi.isLibInit();
            expect(init).toEqual(false);
            SearchApi.isInitialized = true;
        });

    });

    describe('Batch indexing process tests', function () {

        it('should index in a batch', function (done) {
            let messages = [{
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: currentDate.toString(),
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "it works"
            }, {
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: currentDate.toString(),
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "it works"
            }, {
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: currentDate.toString(),
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "it works"
            }];
            const indexBatch = jest.spyOn(SearchApi, 'indexBatch');
            function handleResponse(status, data) {
                expect(indexBatch).toHaveBeenCalled();
                expect(status).toBe(true);
                expect(data).toBe(0);
                done();
            }
            SearchApi.indexBatch(JSON.stringify(messages), handleResponse)
        });

        it('should not batch index', function (done) {
            const indexBatch = jest.spyOn(SearchApi, 'indexBatch');
            function handleResponse(status, data) {
                expect(indexBatch).toHaveBeenCalled();
                expect(status).toBe(false);
                expect(data).toBe("Batch Indexing: Messages are required");
                done();
            }
            SearchApi.indexBatch(undefined, handleResponse);
        });

        it('should not batch index invalid object', function (done) {
            const indexBatch = jest.spyOn(SearchApi, 'indexBatch');
            function handleResponse(status, data) {
                expect(indexBatch).toHaveBeenCalled();
                expect(status).toBe(false);
                expect(data).toEqual("Batch Indexing parse error");
                done();
            }
            SearchApi.indexBatch('message', handleResponse);
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
            const indexBatch = jest.spyOn(SearchApi, 'indexBatch');
            function handleResponse(status, data) {
                expect(indexBatch).toHaveBeenCalled();
                expect(status).toBe(false);
                expect(data).toEqual("Batch Indexing: Messages must be an array");
                done();
            }
            SearchApi.indexBatch(JSON.stringify(message), handleResponse);
        });

        it('should not batch index isInitialized is false', function (done) {
            SearchApi.isInitialized = false;
            let message = [ {
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: currentDate.toString(),
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "it fails"
            } ];
            const indexBatch = jest.spyOn(SearchApi, 'indexBatch');
            function handleResponse(status, data) {
                expect(indexBatch).toHaveBeenCalled();
                expect(status).toBe(false);
                expect(data).toEqual("Library not initialized");
                SearchApi.isInitialized = true;
                done();
            }
            SearchApi.indexBatch(JSON.stringify(message), handleResponse);
        });

        it('should match messages length after batch indexing', function (done) {
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('it works', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(3);
                expect(searchQuery).toHaveBeenCalled();
                done()
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
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('realtime working', ["71811853189212"], ["Au8O2xKHyX1LtE6zW019GX///rZYegAtdA=="], '', undefined, undefined, 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(3);
                expect(searchQuery).toHaveBeenCalled();
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
            const realTimeIndexing = jest.spyOn(SearchApi, 'realTimeIndexing');
            SearchApi.isRealTimeIndexing = true;
            expect(SearchApi.checkIsRealTimeIndexing()).toBe(true);
            SearchApi.batchRealTimeIndexing(message);
            expect(batchRealTimeIndexing).toHaveBeenCalled();
            expect(realTimeIndexing).not.toBeCalled();
            setTimeout(function () {

                SearchApi.searchQuery('isRealTimeIndexing', [], [], '', undefined, undefined, 25, 0, 0).then(function (res) {
                    expect(res.messages.length).toEqual(0);
                    done();
                });
            }, 6000)
        });

        it('should not call the real-time index', function () {
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
            const realTimeIndexing = jest.spyOn(SearchApi, 'realTimeIndexing');
            SearchApi.isRealTimeIndexing = true;
            SearchApi.batchRealTimeIndexing(message);
            expect(batchRealTimeIndexing).toHaveBeenCalled();
            expect(realTimeIndexing).not.toBeCalled();
        });

        it('should not realTime index invalid object', function (done) {
            const realTimeIndexing = jest.spyOn(SearchApi, 'realTimeIndexing');
            function handleResponse(status, data) {
                expect(realTimeIndexing).toHaveBeenCalled();
                expect(status).toBe(false);
                expect(data).toEqual("RealTime Indexing: parse error ");
                done();
            }
            SearchApi.realTimeIndexing('message', handleResponse);
        });

        it('should fail no data is passed for real-time indexing', function (done) {
            const realTimeIndexing = jest.spyOn(SearchApi, 'realTimeIndexing');
            function handleResponse(status, data) {
                expect(realTimeIndexing).toHaveBeenCalled();
                expect(status).toBe(false);
                expect(data).toEqual("RealTime Indexing: parse error ");
                done();
            }
            SearchApi.realTimeIndexing(undefined, handleResponse);
        });

        it('should fail library not initialized', function (done) {
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
            const realTimeIndexing = jest.spyOn(SearchApi, 'realTimeIndexing');
            SearchApi.isInitialized = false;
            function handleResponse(status, data) {
                SearchApi.isInitialized = true;
                expect(status).toBe(false);
                expect(data).toEqual("Library not initialized");
                expect(realTimeIndexing).toHaveBeenCalled();
                expect(realTimeIndexing).toHaveBeenCalledTimes(3);
                done();
            }
            SearchApi.realTimeIndexing(JSON.stringify(message), handleResponse)
        });

        it('should return realTime bool', function () {
            const checkIsRealTimeIndexing = jest.spyOn(SearchApi, 'checkIsRealTimeIndexing');
            SearchApi.isRealTimeIndexing = true;
            expect(SearchApi.checkIsRealTimeIndexing()).toBe(true);
            SearchApi.isRealTimeIndexing = false;
            expect(SearchApi.checkIsRealTimeIndexing()).toBe(false);
            expect(checkIsRealTimeIndexing).toHaveBeenCalled();
            expect(checkIsRealTimeIndexing).toHaveBeenCalledTimes(2);
        });

        it('should delete realtime index', function () {
            const deleteRealTimeFolder = jest.spyOn(SearchApi, 'deleteRealTimeFolder');
            SearchApi.deleteRealTimeFolder();
            expect(deleteRealTimeFolder).toHaveBeenCalled();
        });
    });

    describe('Test for encryption of the index', function () {

        it('should encrypt user index', function (done) {
            const encryptIndex = jest.spyOn(SearchApi, 'encryptIndex');
            SearchApi.encryptIndex(key).then(function () {
                expect(encryptIndex).toHaveBeenCalled();
                done();
            });
        });

        it('should exist encrypted file', function (done) {
            expect(fs.existsSync(path.join(userConfigDir, 'search_index_12345678910112.tar.lz4'))).toBe(false);
            done();
        });
    });

    describe('Test for latest timestamp', function () {

        it('should get the latest timestamp', function (done) {
            const getLatestMessageTimestamp = jest.spyOn(SearchApi, 'getLatestMessageTimestamp');
            function handleResponse(status, data) {
                expect(status).toBe(true);
                expect(data).toEqual(currentDate.toString());
                expect(getLatestMessageTimestamp).toHaveBeenCalled();
                done();
            }
            SearchApi.getLatestMessageTimestamp(handleResponse);
        });

        it('should not get the latest timestamp', function (done) {
            const getLatestMessageTimestamp = jest.spyOn(SearchApi, 'getLatestMessageTimestamp');
            SearchApi.isInitialized = false;
            function handleResponse(status, data) {
                expect(status).toBe(false);
                expect(data).toEqual("Not initialized");
                expect(getLatestMessageTimestamp).toHaveBeenCalled();
                SearchApi.isInitialized = true;
                done();
            }
            SearchApi.getLatestMessageTimestamp(handleResponse);
        });

        it('should be equal to 0000000000000', function (done) {
            const getLatestMessageTimestamp = jest.spyOn(SearchApi, 'getLatestMessageTimestamp');
            libSymphonySearch.symSEClearMainRAMIndex();
            libSymphonySearch.symSEClearRealtimeRAMIndex();
            function handleResponse(status, data) {
                expect(data).toEqual('0000000000000');
                expect(status).toBe(true);
                expect(getLatestMessageTimestamp).toHaveBeenCalled();
                expect(getLatestMessageTimestamp).toHaveBeenCalledTimes(3);
                SearchApi.isInitialized = true;
                done();
            }
            SearchApi.getLatestMessageTimestamp(handleResponse);
        });
    });

    describe('Test to decrypt the index', function () {

        it('should decrypt the index', function (done) {
            const init = jest.spyOn(SearchApi, 'init');
            SearchApi.init(key);
            expect(init).toHaveBeenCalled();
            done();
        });

        it('should get message from the decrypted index', function (done) {
            setTimeout(function () {
                const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
                let endTime = new Date().getTime();
                let startTime = new Date().getTime() - (4 * 31 * 24 * 60 * 60 * 1000);
                SearchApi.searchQuery('it works', [], [], '', startTime.toString(), endTime.toString(), '0', 0.2, 0.1).then(function (res) {
                    expect(res.messages.length).toEqual(3);
                    expect(searchQuery).toHaveBeenCalled();
                    done()
                });
            }, 3000)
        });
    });

    describe('Test for search functions', function () {

        it('should search fail isInitialized is false', function (done) {
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.isInitialized = false;
            SearchApi.searchQuery('it works', [], [], '', '', '', 25, 0, 0).then(function (res) {
                expect(res).toEqual({
                    messages: [],
                    more: 0,
                    returned: 0,
                    total: 0,
                });
                expect(searchQuery).toHaveBeenCalled();
                SearchApi.isInitialized = true;
                done();
            });
        });

        it('should filter search limit ', function (done) {
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('works', [], [], '', '', '', 2, 0, 0).then(function (res) {
                expect(res.messages.length).toBe(2);
                expect(searchQuery).toHaveBeenCalledTimes(6);
                expect(searchQuery).toHaveBeenCalled();
                done();
            });
        });

        it('should search fails result cleared', function (done) {
            libSymphonySearch.symSEClearMainRAMIndex();
            libSymphonySearch.symSEClearRealtimeRAMIndex();
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('it works', [], [], '', '', '', 25, 0, 0).then(function (res) {
                expect(res.messages.length).toBe(0);
                expect(searchQuery).toHaveBeenCalledTimes(7);
                expect(searchQuery).toHaveBeenCalled();
                SearchApi = undefined;
                const { Search } = require('../js/search/search.js');
                SearchApi = new Search(userId, key);
                done();
            });
        });

        it('should search fails query is undefined', function (done) {
            setTimeout(function () {
                const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
                expect(SearchApi.isInitialized).toBe(true);
                SearchApi.searchQuery(undefined, [], [], '', '', '', 25, 0, 0).then(function (res) {
                    expect(res).toEqual({
                        messages: [],
                        more: 0,
                        returned: 0,
                        total: 0,
                    });
                    expect(searchQuery).toHaveBeenCalled();
                    done();
                });
            }, 3000);
        });

        it('should search for hashtag', function (done) {
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('#123 "testing"', [], [], 'attachment', '', '', 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(0);
                expect(searchQuery).toHaveBeenCalled();
                done();
            });
        });

        it('should search for pdf', function (done) {
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('', [], [], 'pdf', '', '', 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(0);
                expect(searchQuery).toHaveBeenCalled();
                expect(searchQuery).toHaveBeenCalledTimes(3);
                done();
            });
        });

        it('should index for testing quote', function (done) {
            let messages = [{
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: currentDate.toString(),
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "quote search"
            }, {
                messageId: "Jc+4K8RtPxHJfyuDQU9atX///qN3KHYXdA==",
                threadId: "Au8O2xKHyX1LtE6zW019GX///rZYegAtdA==",
                ingestionDate: currentDate.toString(),
                senderId: "71811853189212",
                chatType: "CHATROOM",
                isPublic: "false",
                sendingApp: "lc",
                text: "search"
            }];
            const indexBatch = jest.spyOn(SearchApi, 'indexBatch');
            function handleReponse(status, data) {
                expect(indexBatch).toHaveBeenCalled();
                expect(status).toBe(true);
                expect(data).toBe(0);
                done();
            }
            SearchApi.indexBatch(JSON.stringify(messages), handleReponse);
        });

        it('should search without quote', function (done) {
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('search', [], [], undefined, '', '', 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(2);
                expect(searchQuery).toHaveBeenCalled();
                expect(searchQuery).toHaveBeenCalledTimes(4);
                done();
            });
        });

        it('should quote search', function (done) {
            const searchQuery = jest.spyOn(SearchApi, 'searchQuery');
            SearchApi.searchQuery('\"quote search\"', [], [], undefined, '', '', 25, 0, 0).then(function (res) {
                expect(res.messages.length).toEqual(1);
                expect(searchQuery).toHaveBeenCalled();
                expect(searchQuery).toHaveBeenCalledTimes(5);
                done();
            });
        });
    });
});
