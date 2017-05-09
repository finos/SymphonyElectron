const throttle = require('../../js/utils/throttle.js');

describe('throttle tests', function() {
    var now, origNow;
    beforeEach(function() {
        origNow = Date.now;
        // mock date func
        Date.now = function() { return now };
        now = 10000;
    });

    it('expect to be called only once when called more than once in 1 second period',
    function() {
        jest.useFakeTimers();

        const callback = jest.fn();
        const throttledCB = throttle(1000, callback);

        expect(callback).not.toBeCalled();

        throttledCB();
        expect(callback.mock.calls.length).toBe(1);

        throttledCB();
        expect(callback.mock.calls.length).toBe(1);

        now += 1000;
        jest.runTimersToTime(1000);
        expect(callback.mock.calls.length).toBe(2);

        throttledCB();
        expect(callback.mock.calls.length).toBe(2);

        now += 900;
        jest.runTimersToTime(900);
        expect(callback.mock.calls.length).toBe(2);

        now += 100;
        jest.runTimersToTime(100);
        expect(callback.mock.calls.length).toBe(3);
    });

    it('expect to be called twice when call spacing > 1 sec', function() {
        const callback = jest.fn();
        const throttledCB = throttle(1000, callback);

        expect(callback).not.toBeCalled();

        throttledCB();
        expect(callback.mock.calls.length).toBe(1);

        now += 1000;

        throttledCB();
        expect(callback.mock.calls.length).toBe(2);
    });

    afterEach(function() {
        // restore orig
        Date.now = origNow;
    })
});
