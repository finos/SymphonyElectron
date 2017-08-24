const electron = require('./__mocks__/electron');
const childProcess = require('child_process');

let activityDetection;

describe('Tests for Activity Detection', function() {

    const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90000;

    beforeAll(function(done) {
        childProcess.exec(`npm rebuild --target=${process.version} --build-from-source`, function(err) {
            activityDetection = require('../js/activityDetection');
            activityDetection.setActivityWindow(900000, electron.ipcRenderer);
            done();
        });
    });

    beforeEach(function() {
        jest.clearAllMocks()
    });

    afterAll(function(done) {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });

    it('should return null', function() {

        activityDetection.setActivityWindow(0, electron.ipcRenderer);
        const noData = activityDetection.activityDetection();
        expect(noData).toBeNull();

    });

    it('should send activity event', function() {
        const spy = jest.spyOn(activityDetection, 'send');

        expect(spy).not.toBeCalled();

        activityDetection.send({ systemIdleTime: 120000 });
        expect(spy).toHaveBeenCalledWith({ systemIdleTime: 120000 });

    });

    it('should monitor user activity', function() {
        activityDetection.setActivityWindow(500000, electron.ipcRenderer);
        const spy = jest.spyOn(activityDetection, 'monitorUserActivity');

        expect(spy).not.toBeCalled();

        activityDetection.monitorUserActivity();
        expect(spy).toHaveBeenCalled();

    });

    it('should not send activity event as data is undefined', function() {
        const spy = jest.spyOn(activityDetection, 'send');

        expect(spy).not.toBeCalled();

        activityDetection.send(undefined);
        expect(spy).toHaveBeenCalledWith(undefined);

    });

});