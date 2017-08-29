const throttle = require('../../js/utils/throttle.js');

describe('throttle tests', function() {
    let now, origNow;
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

    it('expect clearTimeout to be invoked', function() {
        const callback = jest.fn();
        const throttledCB = throttle(1000, callback);

        expect(callback).not.toBeCalled();

        throttledCB();
        expect(callback.mock.calls.length).toBe(1);
        expect(clearTimeout.mock.calls.length).toBe(0);

        now -= 1000;
        throttledCB();
        expect(callback.mock.calls.length).toBe(1);

        now += 1000;
        throttledCB();
        expect(callback.mock.calls.length).toBe(1);
        expect(clearTimeout.mock.calls.length).toBe(1);
    });

    describe('expect to throw exception', function() {
        it('when calling throttle with time equal to zero', function(done) {
            try {
                throttle(0, function() {});
            } catch(error) {
                expect(error.message).toBeDefined();
                done();
            }
        });

        it('when calling throttle with time less than zero', function(done) {
            try {
                throttle(-1, function() {});
            } catch(error) {
                expect(error.message).toBeDefined();
                done();
            }
        });

        it('when calling throttle without a function callback', function(done) {
            try {
                throttle(1, 'not a func');
            } catch(error) {
                expect(error.message).toBeDefined();
                done();
            }
        });
    });

    afterEach(function() {
        // restore orig
        Date.now = origNow;
    })
});
