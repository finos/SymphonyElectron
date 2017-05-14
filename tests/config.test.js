const { getConfigField, updateConfigField, configFileName } = require('../js/config');
const fs = require('fs');
const path = require('path');
const os = require('os');

// mock required so getConfig reads config from correct path
jest.mock('../js/utils/misc.js', function() {
    return {
        isDevEnv: false,
        isMac: false
    }
});

let globalConfigDir;
let userConfigDir;

jest.mock('electron', function() {
    return {
        app: {
            getPath: mockedGetPath
        }
    }
});

function mockedGetPath(type) {
    if (type === 'exe') {
        return globalConfigDir;
    }

    if (type === 'userData') {
        return userConfigDir
    }
    return '';
}

describe('getConfigField tests', function() {

    beforeEach(function() {
        /// reset module vars between running tests.
        globalConfigDir = null;
        userConfigDir = null;
    });

    afterEach(function() {
        // clean up temp files creating during tests
        if (globalConfigDir) {
            fs.unlinkSync(path.join(globalConfigDir, configFileName));
            fs.rmdirSync(globalConfigDir);
            fs.rmdirSync(path.join(globalConfigDir, '..'));
        }
        if (userConfigDir) {
            fs.unlinkSync(path.join(userConfigDir, configFileName));
            fs.rmdirSync(userConfigDir);
        }
    });

    function createTempConfigFile(filePath, config) {
        fs.writeFileSync(filePath, JSON.stringify(config));
    }

    function createTempUserConfig(config) {
        var tmpDir = os.tmpdir();
        userConfigDir = fs.mkdtempSync(path.join(tmpDir, 'config-'));
        return createTempConfigFile(path.join(userConfigDir, configFileName), config);
    }

    function createTempGlobalConfig(config) {
        var tmpDir = os.tmpdir();
        globalConfigDir = path.join(fs.mkdtempSync(path.join(tmpDir, 'config-')), 'config');
        fs.mkdirSync(globalConfigDir);
        return createTempConfigFile(path.join(globalConfigDir, configFileName), config);
    }

    function removeTempConfigFile(filePath) {
        fs.unlinkSync(filePath);
    }

    describe('getConfigField tests', function() {
        it('should fail when field not present in either user or global config', function() {
            var userConfig = {
                url: 'something'
            }

            createTempUserConfig(userConfig);

            var globalConfig = {
                url: 'something-else'
            }

            createTempGlobalConfig(globalConfig);

            return getConfigField('noturl').catch(function(err) {
                expect(err).toBeTruthy();
            });
        });

        it('should succeed when field only present in user config', function() {
            var userConfig = {
                url: 'something'
            }

            createTempUserConfig(userConfig);

            return getConfigField('url').then(function(url) {
                expect(url).toBe('something');
            });
        });

        it('should succeed when field only present in global config', function() {
            var globalConfig = {
                url: 'something-else'
            }

            createTempGlobalConfig(globalConfig);

            return getConfigField('url').then(function(url) {
                expect(url).toBe('something-else');
            });
        });

        it('should succeed and return user config field when value is in both', function() {
            var userConfig = {
                url: 'something'
            }

            createTempUserConfig(userConfig);

            var globalConfig = {
                url: 'something-else'
            }

            createTempGlobalConfig(globalConfig);

            return getConfigField('url').then(function(url) {
                expect(url).toBe('something');
            });
        });
    });

    describe('updateConfigField tests', function() {

        it('should succeed and overwrite existing field', function() {
            var userConfig = {
                url: 'something'
            }

            createTempUserConfig(userConfig);

            return updateConfigField('url', 'hello world')
                .then(function(newConfig) {
                    expect(newConfig).toEqual({
                        url: 'hello world'
                    });
                });
        });

        it('should succeed and add new field', function() {
            var userConfig = {
                url: 'something'
            }

            createTempUserConfig(userConfig);

            return updateConfigField('url2', 'hello world')
                .then(function(newConfig) {
                    expect(newConfig).toEqual({
                        url: 'something',
                        url2: 'hello world'
                    });
                });
        });
    });
});
