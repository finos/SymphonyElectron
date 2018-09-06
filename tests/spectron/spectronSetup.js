const Application = require('spectron').Application;
const path = require('path');
const fs = require('fs');
const { isMac, isWindowsOS } = require('../../js/utils/misc');
const ncp = require('ncp').ncp;
const constants = require('./spectronConstants.js');
const ui = require('./spectronInterfaces.js');

class App {

    constructor(options) {

        this.options = options;

        if (!this.options.path) {
            this.options.path = App.getAppPath();
            this.options.args = [path.join(__dirname, '..', '..', 'js/main.js')];
        }

        if (isMac) {
            App.copyConfigPath(constants.ELECTRON_GLOBAL_CONFIG_PATH_MAC);
            App.copyLibraries(constants.SEARCH_LIBRARY_PATH_MAC);
        }

        this.app = new Application(this.options);
    }

    async startApplication(configurations) {
        try {
            this.app = await this.app.start();
            await this.app.client.waitForVisible(ui.SYM_LOGO, constants.TIMEOUT_PAGE_LOAD);
            if (configurations) {
                if (typeof configurations.alwaysOnTop !== "undefined") {
                    await this.app.browserWindow.setAlwaysOnTop(configurations.alwaysOnTop);
                }
                if (configurations.testedHost) {
                    await this.app.client.waitUntilWindowLoaded().url(configurations.testedHost);
                }
            }

            if ((typeof configurations === "undefined") || (typeof configurations.defaultSize === "undefined") || (configurations.defaultSize === true)) {
                await this.app.browserWindow.setSize(900, 900);
            }
            if ((typeof configurations === "undefined") || (typeof configurations.defaultPosition === "undefined") || (configurations.defaultPosition === true)) {
                await this.app.browserWindow.center();
            }
            await this.app.browserWindow.minimize();
            await this.app.browserWindow.restore();
            return this.app;
        } catch (err) { 
            throw new Error("Unable to start application " + err);
        };
    }

    static getAppPath() {
        let electronPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron');
        if (process.platform === 'win32') {
            electronPath += '.cmd';
        }
        return electronPath
    }

    static getTimeOut() {
        return 120000;
    }

    static readConfig(configPath) {

        const configFilePath = configPath + constants.SYMPHONY_CONFIG_FILE_NAME;

        if (!fs.existsSync(configFilePath)) {
            return new Promise(function (resolve, reject) {
                App.copyConfigPath(configPath).then(() => {
                    fs.readFile(configFilePath, 'utf-8', function (err, data) {
                        if (err) {
                            throw new Error(`Unable to read user config file at ${configFilePath}  ${err}`);
                        }
                        let parsedData;
                        try {
                            parsedData = JSON.parse(data);
                        } catch (err) {
                            return reject(err);
                        }
                        return resolve(parsedData);
                    });
                });
            });
        }

        return new Promise(function (resolve, reject) {
            fs.readFile(configFilePath, 'utf-8', function (err, data) {
                if (err) {
                    throw new Error(`Unable to read user config file at ${configFilePath}  ${err}`);
                }
                let parsedData;
                try {
                    parsedData = JSON.parse(data);
                } catch (err) {
                    reject(err);
                }
                resolve(parsedData);
            });
        });
    }

    static copyConfigPath(configPath) {
        return new Promise((resolve) => {
            ncp('config', configPath, function (err) {
                if (err) {
                    throw new Error("Unable to copy config file to Electron dir " + err);
                }
                return resolve();
            });
        })
    }

    static copyLibraries(libraryPath) {
        return new Promise((resolve) => {
            return ncp('library', libraryPath, function (err) {
                if (err) {
                    throw new Error("Unable to copy Swift search Libraries " + err);
                }
                return resolve();
            });
        });
    }
     
}

module.exports = App;
