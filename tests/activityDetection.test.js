// const activityDetection = require('../js/activityDetection/activityDetection.js');
// const electron = require('./__mocks__/electron');

xdescribe('Tests for Activity Detection', function () {

    beforeAll(function () {
        activityDetection.setActivityWindow(120000, electron.ipcRenderer);
    });

    it('should get user activity where user is not idle', function () {
        const data = activityDetection.activityDetection();

        expect(data.isUserIdle).toBe(false);
        expect(data.systemIdleTime).toBeLessThan(120000);
    });

    it('should return null', function () {
        const spy = jest.spyOn(activityDetection, 'activityDetection');
        const data = activityDetection.activityDetection();

        expect(spy).toHaveBeenCalled();
        expect(data.isUserIdle).toBe(false);

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

});
