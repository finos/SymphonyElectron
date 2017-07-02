const Application = require('spectron').Application;
const path = require('path');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiRoughly = require('chai-roughly');

global.before(function () {
    chai.should();
    chai.use(chaiAsPromised);
    chai.use(chaiRoughly);
});

class App {

    constructor(options) {

        this.options = options;

        if (!this.options.path){
            this.options.path = App.getAppPath();
            this.options.args = [path.join(__dirname, '..', 'js/main.js')];
        }

        this.app = new Application(this.options);
    }

    startApplication() {
        return this.app.start().then(() => {
            chaiAsPromised.transferPromiseness = this.app.transferPromiseness;
            return this.app
        });
    }

    static getAppPath() {
        let electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');
        if (process.platform === 'win32') {
            electronPath += '.cmd';
        }
        return electronPath
    }

}

module.exports = App;