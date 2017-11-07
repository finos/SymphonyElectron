const { clearCachedConfigs, getConfigField, updateConfigField, configFileName, saveUserConfig } = require('../js/config');
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

describe('read/write config tests', function() {

    beforeEach(function() {
        /// reset module vars between running tests.
        globalConfigDir = null;
        userConfigDir = null;

        // reset module values so each test starts clean.
        clearCachedConfigs();
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
        const tmpDir = os.tmpdir();
        userConfigDir = fs.mkdtempSync(path.join(tmpDir, 'config-'));
        return createTempConfigFile(path.join(userConfigDir, configFileName), config);
    }

    function createTempGlobalConfig(config) {
        const tmpDir = os.tmpdir();
        globalConfigDir = path.join(fs.mkdtempSync(path.join(tmpDir, 'config-')), 'config');
        fs.mkdirSync(globalConfigDir);
        return createTempConfigFile(path.join(globalConfigDir, configFileName), config);
    }

    function removeTempConfigFile(filePath) {
        fs.unlinkSync(filePath);
    }

    describe('getConfigField tests', function() {
        it('should fail when field not present in either user or global config', function() {
            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            const globalConfig = {
                url: 'something-else'
            };

            createTempGlobalConfig(globalConfig);

            return getConfigField('noturl').catch(function(err) {
                expect(err).toBeTruthy();
            });
        });

        it('should succeed when field only present in user config', function() {
            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            return getConfigField('url').then(function(url) {
                expect(url).toBe('something');
            });
        });

        it('should succeed when field only present in global config', function() {
            const globalConfig = {
                url: 'something-else'
            };

            createTempGlobalConfig(globalConfig);

            return getConfigField('url').then(function(url) {
                expect(url).toBe('something-else');
            });
        });

        it('should succeed and return user config field when value is in both', function() {
            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            const globalConfig = {
                url: 'something-else'
            };

            createTempGlobalConfig(globalConfig);

            return getConfigField('url').then(function(url) {
                expect(url).toBe('something');
            });
        });

        it('should fail when global config path is invalid', function() {
            const globalConfig = {
                url: 'something-else'
            };
            createTempGlobalConfig(globalConfig);

            let correctConfigDir = globalConfigDir;
            globalConfigDir = '//';

            return getConfigField('url').catch(function(err) {
                globalConfigDir = correctConfigDir;
                expect(err).toBeTruthy();
            });
        });

        it('should fail when user config path is invalid', function() {
            const userConfig = {
                url: 'something'
            };
            createTempUserConfig(userConfig);

            let correctConfigDir = userConfigDir;
            userConfigDir = '//';

            return getConfigField('url').catch(function(err) {
                userConfigDir = correctConfigDir;
                expect(err).toBeTruthy();
            });
        });

        it('should read cached user config value rather than reading file from disk again', function(done) {
            const userConfig = {
                url: 'qa4.symphony.com'
            };
            createTempUserConfig(userConfig);

            const userConfig2 = {
                url: 'qa5.symphony.com'
            };

            return getConfigField('url')
                .then(function() {
                    createTempUserConfig(userConfig2);
                })
                .then(function() {
                    return getConfigField('url')
                })
                .then(function(url) {
                    expect(url).toBe('qa4.symphony.com');
                    done();
                });
        });

        it('should read cache global config value rather than reading file from disk again', function(done) {
            const globalConfig = {
                url: 'qa8.symphony.com'
            };
            createTempGlobalConfig(globalConfig);

            const globalConfig2 = {
                url: 'qa9.symphony.com'
            };

            return getConfigField('url')
                .then(function() {
                    createTempGlobalConfig(globalConfig2);
                })
                .then(function() {
                    return getConfigField('url')
                })
                .then(function(url) {
                    expect(url).toBe('qa8.symphony.com');
                    done();
                });
        });

    });

    describe('updateConfigField tests', function() {

        it('should succeed and overwrite existing field', function() {
            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            return updateConfigField('url', 'hello world')
                .then(function(newConfig) {
                    expect(newConfig).toEqual({
                        url: 'hello world'
                    });
                });
        });

        it('should succeed and add new field', function() {
            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            return updateConfigField('url2', 'hello world')
                .then(function(newConfig) {
                    expect(newConfig).toEqual({
                        url: 'something',
                        url2: 'hello world'
                    });
                });
        });

        it('should fail to update if invalid field name', function() {

            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            return updateConfigField('', 'hello word').catch(function (err) {
                expect(err).toBe('can not save config, invalid input');
            });

        });

        it('should throw error if path is not defined', function() {

            userConfigDir = null;

            return updateConfigField('url2', 'hello world')
                .catch(function (err) {
                    expect(err).toThrow(err);
                });

        });

        it('should throw error if fieldName is not defined', function() {

            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            return saveUserConfig(undefined, 'something', 'oldConfig')
                .catch(function (reject) {
                    expect(reject).toBe('can not save config, invalid input');
                });
        });

        it('should throw error if config is not defined', function() {

            const userConfig = {
                url: 'something'
            };

            createTempUserConfig(userConfig);

            return saveUserConfig('url2', 'something', undefined)
                .catch(function (reject) {
                    expect(reject).toBe('can not save config, invalid input');
                });
        });

        it('should throw error if path is not defined for saveUserConfig()', function() {

            userConfigDir = null;

            return saveUserConfig('url2', 'hello world')
                .catch(function (err) {
                    expect(err).toThrow(err);
                });
        });

    });
});
