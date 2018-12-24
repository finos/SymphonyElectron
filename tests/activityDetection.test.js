const electron = require('./__mocks__/electron');
const activityDetection = require('../js/activityDetection');
describe('Tests for Activity Detection', function() {

    const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

     beforeAll(function(done) {
         electron.app.isReady = jest.fn().mockReturnValue(true);
         electron.powerMonitor = { querySystemIdleTime: jest.fn() }
         done();
     });

    beforeEach(function() {
        jest.clearAllMocks()
    });

    afterAll(function(done) {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
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

    it('should start `activityDetection()`', () => {
        const spy = jest.spyOn(activityDetection, 'activityDetection');
        expect(spy).not.toBeCalled();
        
        activityDetection.activityDetection();
        expect(spy).toBeCalled();
    });

    it('should not send activity event as data is undefined', function() {
        const spy = jest.spyOn(activityDetection, 'send');

        expect(spy).not.toBeCalled();

        activityDetection.send(undefined);
        expect(spy).toHaveBeenCalledWith(undefined);

    });

    it('should call `send()` when period was greater than idleTime', () => {
               
        const spy = jest.spyOn(activityDetection, 'send');
        
        expect(spy).not.toBeCalled();
        
        electron.powerMonitor = { querySystemIdleTime: jest.fn().mockImplementationOnce(cb => cb(1)) };
        activityDetection.setActivityWindow(900000, electron.ipcRenderer);
        
        expect(spy).toBeCalled();

    });
    
    it('should start `activityDetection()` when `setActivityWindow()` was called', () => {
        const spy = jest.spyOn(activityDetection, 'activityDetection');
       
        expect(spy).not.toBeCalled();
       
        activityDetection.setActivityWindow(900000, electron.ipcRenderer);

        expect(spy).toBeCalled();
        
    });    
});
