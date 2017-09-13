const Application = require('spectron').Application;
const path = require('path');
const fs = require('fs');
const {isMac} = require('../../js/utils/misc');
const ncp = require('ncp').ncp;

class App {

    constructor(options) {

        this.options = options;

        if (!this.options.path) {
            this.options.path = App.getAppPath();
            this.options.args = [path.join(__dirname, '..', '..', 'js/main.js')];
        }

        App.copyConfigPath();

        this.app = new Application(this.options);
    }

    startApplication() {
        return this.app.start().then((app) => {
            return app;
        }).catch((err) => {
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
        return new Promise(function (resolve, reject) {
            fs.readFile(configPath, function (err, data) {
                if (err) {
                    reject(err);
                }
                resolve(JSON.parse(data));
            });
        });
    }

    static copyConfigPath() {
        if (isMac) {
            ncp('config', 'node_modules/electron/dist/Electron.app/Contents/config', function (err) {
                if (err) {
                    throw(err);
                }
            });
        } else {
            ncp('config', 'node_modules/electron/dist/config', function (err) {
                if (err) {
                    throw(err);
                }
            });
        }
    }

}

module.exports = App;