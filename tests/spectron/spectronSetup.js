const Application = require('spectron').Application;
const path = require('path');
const fs = require('fs');
const { isMac, isWindowsOS } = require('../../js/utils/misc');
const ncp = require('ncp').ncp;

class App {

    constructor(options) {

        this.options = options;

        if (!this.options.path) {
            this.options.path = App.getAppPath();
            this.options.args = [path.join(__dirname, '..', '..', 'js/main.js')];
        }

        App.copyConfigPath();
        App.copyLibraries();

        this.app = new Application(this.options);
    }

    startApplication() {
        return this.app.start().then((app) => {
            return app;
        }).catch((err) => {
            throw new Error("Unable to start application " + err);
        });
    }

    static getAppPath() {
        let electronPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron');
        if (process.platform === 'win32') {
            electronPath += '.cmd';
        }
        return electronPath
    }

    static getTimeOut() {
        return 90000
    }

    static readConfig(configPath) {

        if (!fs.existsSync(configPath)) {
            return new Promise(function (resolve) {
                this.copyConfigPath().then(() => {
                    fs.readFile(configPath, 'utf-8', function (err, data) {
                        if (err) {
                            throw new Error("Unable to read user config file " + err);
                        }
                        resolve(JSON.parse(data));
                    });
                });
            });
        }

        return new Promise(function (resolve) {
            fs.readFile(configPath, 'utf-8', function (err, data) {
                if (err) {
                    throw new Error("Unable to read user config file " + err);
                }
                resolve(JSON.parse(data));
            });
        });
    }

    static copyConfigPath() {
        return new Promise((resolve) => {
            if (isMac) {
                ncp('config', 'node_modules/electron/dist/Electron.app/Contents/config', function (err) {
                    if (err) {
                        throw new Error("Unable to copy config file to Electron dir " + err);
                    }
                    return resolve();
                });
            }

            if (isWindowsOS) {
                ncp('config', 'node_modules/electron/dist/config', function (err) {
                    if (err) {
                        throw new Error("Unable to copy config file to Electron dir " + err);
                    }
                    return resolve();
                });
            }
        })
    }

    static copyLibraries() {
        return new Promise((resolve) => {
            if (isMac) {
                return ncp('library', 'node_modules/electron/dist/Electron.app/Contents/library', function (err) {
                    if (err) {
                        throw new Error("Unable to copy Swift search Libraries " + err);
                    }
                    return resolve();
                });
            }

            if (isWindowsOS) {
                return ncp('library', 'node_modules/electron/dist/library', function (err) {
                    if (err) {
                        throw new Error("Unable to copy Swift search Libraries " + err);
                    }
                    return resolve();
                });
            }
        });
    }

}

module.exports = App;