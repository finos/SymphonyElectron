const fs = require('fs');
const path = require('path');
const { isMac, isWindowsOS } = require('../js/utils/misc.js');

let executionPath = null;
let userConfigDir = null;

let SearchUtilsAPI;
let searchConfig;

jest.mock('electron', function() {
    return {
        app: {
            getPath: mockedGetPath
        }
    }
});

function mockedGetPath(type) {
    switch (type) {
        case 'exe':
            return executionPath;
        case 'userData':
            return userConfigDir;
        default:
            return ''
    }
}

describe('Tests for Search Utils', function() {

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    beforeAll(function (done) {
        executionPath = path.join(__dirname, 'library');
        if (isWindowsOS) {
            executionPath = path.join(__dirname, '..', 'library');
        }
        userConfigDir = path.join(__dirname, '..');
        searchConfig = require('../js/search/searchConfig.js');
        const { SearchUtils } = require('../js/search/searchUtils.js');
        SearchUtilsAPI = new SearchUtils();
        SearchUtilsAPI.path = userConfigDir;
        if (fs.existsSync(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE)) {
            fs.unlinkSync(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE);
        }
        done();
    });

    afterAll(function (done) {
        fs.unlinkSync(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE);
        done();
    });

    describe('Tests for checking disk space', function () {

        it('should return free space', function (done) {
            const checkFreeSpace = jest.spyOn(SearchUtilsAPI, 'checkFreeSpace');
            SearchUtilsAPI.checkFreeSpace().then(function () {
                expect(checkFreeSpace).toHaveBeenCalled();
                done();
            });
        });

        it('should return error', function (done) {
            const checkFreeSpace = jest.spyOn(SearchUtilsAPI, 'checkFreeSpace');
            if (isMac) {
                SearchUtilsAPI.path = undefined;
                SearchUtilsAPI.checkFreeSpace().catch(function (err) {
                    expect(err).toEqual(new Error("Please provide path"));
                    expect(checkFreeSpace).toHaveBeenCalled();
                    done();
                });
            } else {
                SearchUtilsAPI.path = undefined;
                SearchUtilsAPI.checkFreeSpace().catch(function (err) {
                    expect(err).toBeTruthy();
                    expect(checkFreeSpace).toHaveBeenCalled();
                    done();
                });
            }
        });

        it('should return error invalid path', function (done) {
            const checkFreeSpace = jest.spyOn(SearchUtilsAPI, 'checkFreeSpace');
            SearchUtilsAPI.path = './tp';
            if (isWindowsOS) {
                SearchUtilsAPI.path = 'A://test';
                searchConfig.LIBRARY_CONSTANTS.FREE_DISK_SPACE = path.join(__dirname, '..',
                    "node_modules/electron-utils/FreeDiskSpace/bin/Release/FreeDiskSpace.exe");
            }
            SearchUtilsAPI.checkFreeSpace().catch(function (err) {
                searchConfig.LIBRARY_CONSTANTS.FREE_DISK_SPACE = path.join(__dirname, '..',
                    "library/FreeDiskSpace.exe");
                expect(checkFreeSpace).toHaveBeenCalled();
                expect(err).toBeTruthy();
                done();
            });
        });
    });

    describe('Test for search users config', function () {

        it('should return null for new user config', function (done) {
            SearchUtilsAPI.getSearchUserConfig(1234567891011).then(function (res) {
                expect(res).toEqual(null);
                done();
            });
        });

        it('should exist users config file', function (done) {
            setTimeout(function () {
                expect(fs.existsSync(searchConfig.FOLDERS_CONSTANTS.USER_CONFIG_FILE)).toEqual(true);
                done();
            }, 2000)
        });

        it('should exist users config file', function (done) {
            setTimeout(function () {
                SearchUtilsAPI.getSearchUserConfig(1234567891011).then(function (res) {
                    expect(res).toEqual({});
                    done();
                });
            }, 3000)
        });

        it('should update user config file', function (done) {
            let data = {
                rotationId: 0,
                version: 1,
                language: 'en'
            };
            SearchUtilsAPI.updateUserConfig(1234567891011, data).then(function (res) {
                data.indexVersion = 'v1';
                expect(res).toEqual(data);
                done();
            })
        });

        it('should modify user config file', function (done) {
            let data = {
                rotationId: 1,
                version: 1,
                language: 'en'
            };
            SearchUtilsAPI.updateUserConfig(1234567891011, data).then(function (res) {
                expect(res.rotationId).toEqual(1);
                expect(res.indexVersion).toEqual('v1');
                done();
            })
        });

        it('should create user if not exist', function (done) {
            SearchUtilsAPI.getSearchUserConfig(2234567891011).catch(function (err) {
                expect(err).toEqual(null);
                done();
            })
        });
        
    });

});
