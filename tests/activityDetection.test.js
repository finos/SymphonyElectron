const electron = require('./__mocks__/electron');
const childProcess = require('child_process');
const nodeAbi = require('node-abi');

let activityDetection;
let nodeVersion = nodeAbi.getAbi(process.version, 'node');
let targetElectronVersion = nodeAbi.getTarget(nodeVersion, 'electron');

describe('Tests for Activity Detection', function() {

    var originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    beforeAll(function (done) {
        childProcess.exec(`npm rebuild --runtime=electron --target=${targetElectronVersion} --disturl=https://atom.io/download/atom-shell --build-from-source`, function (err) {
            activityDetection = require('../js/activityDetection/activityDetection.js');
            activityDetection.setActivityWindow(900000, electron.ipcRenderer);
            done();
        });
    });

    beforeEach(function () {
        jest.clearAllMocks()
    });

    afterAll(function (done) {
        childProcess.exec('npm run rebuild', function (err, stdout) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            done();
        });
    });

    it('should return null', function() {

        activityDetection.setActivityWindow(0, electron.ipcRenderer);
        const noData = activityDetection.activityDetection();
        expect(noData).toBeNull();

    });

    it('should send activity event', function () {
        const spy = jest.spyOn(activityDetection, 'send');

        expect(spy).not.toBeCalled();

        activityDetection.send({systemIdleTime: 120000});
        expect(spy).toHaveBeenCalledWith({systemIdleTime: 120000});

    });

    it('should monitor user activity', function () {
        activityDetection.setActivityWindow(500000, electron.ipcRenderer);
        const spy = jest.spyOn(activityDetection, 'monitorUserActivity');

        expect(spy).not.toBeCalled();

        activityDetection.monitorUserActivity();
        expect(spy).toHaveBeenCalled();

    });

    it('should not send activity event as data is undefined', function () {
        const spy = jest.spyOn(activityDetection, 'send');

        expect(spy).not.toBeCalled();

        activityDetection.send(undefined);
        expect(spy).toHaveBeenCalledWith(undefined);

    });

});
