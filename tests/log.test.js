const { Logger } = require('../js/log.js');

describe('logger tests', function() {
    let log;

    beforeEach(function() {
        // get new rewired version for each test.
        log = new Logger();
    });

    it('when no logger registered then queue items', function() {
        log.send('DEBUG', 'test');
        log.send('DEBUG', 'test2');
        let queue = log.logQueue;
        expect(queue.length).toBe(2);
    });

    it('flush queue when logger get registered', function() {
        log.send('DEBUG', 'test');
        log.send('DEBUG', 'test2');

        let mockWin = {
            send: jest.fn()
        };

        log.setLogWindow(mockWin);

        let queue = log.logQueue;

        expect(mockWin.send).toHaveBeenCalled();
        expect(queue.length).toBe(0);
    });

    it('send single log msg logger has already been registered', function() {
        let mockWin = {
            send: jest.fn()
        };

        log.setLogWindow(mockWin);
        log.send('DEBUG', 'test');

        let queue = log.logQueue;

        expect(mockWin.send).toHaveBeenCalled();
        expect(queue.length).toBe(0);
    });

    it('should cap at 100 queued log messages', function() {
        for(let i = 0; i < 110; i++) {
            log.send('DEBUG', 'test' + i);
        }

        let queue = log.logQueue;
        expect(queue.length).toBe(100);
    })
});
