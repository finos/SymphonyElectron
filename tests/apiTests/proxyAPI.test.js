const EventEmitter = require('events');

const createProxy = require('../../js/preload/createProxy.js');
const mainApiMgr = require('../../js/mainApiMgr.js');

mainApiMgr.shouldCheckValidWindow(false);

// need polyfil for html5 Proxy
require('./proxy-polyfill');

class testInterface {
    constructor(arg1, arg2) {}

    getArg1() {};

    addToArg2(value) {}

    get argumentOne() {}

    set newArgOneValue(newValue) {}

    static staticMethodSum(a, b) {}

    static get staticGetter() {}

    addEventListener(event,cb) {}

    removeEventListener(event,cb) {}

    emitEvent(event) {}

    close() {}

    destroy() {}
}

class testImpl {
    constructor(arg1, arg2) {
        this._arg1 = arg1;
        this._arg2 = arg2;
        this.emitter = new EventEmitter();
    }

    getArg1() {
        return this._arg1;
    };

    addToArg2(value) {
        return this._arg2 + value;
    }

    get argumentOne() {
        return this._arg1;
    }

    set newArgOneValue(newValue) {
        this._arg1 = newValue;
    }

    static staticMethodSum(a, b) {
        return a + b;
    }

    static get staticGetter() {
        return 'hello world';
    }

    addEventListener(event, cb) {
        this.emitter.on(event, cb);
    }

    removeEventListener(event,cb) {
        this.emitter.removeListener(event, cb);
    }

    emitEvent(event) {
        this.emitter.emit(event);
    }

    close() {
        this.emitter.emit('destroy');
    }

    destroy() {}
}

mainApiMgr.addNewInterface('testInterface', testImpl);

describe('proxy tests...', function() {
    var inst;
    var TestInterfaceProxy;

    const arg1 = 3, arg2 = 2;

    beforeEach(function() {
        TestInterfaceProxy = createProxy(testInterface);
        inst = new TestInterfaceProxy(arg1, arg2);
    });

    test('getArg1 method', function(done) {
        inst.getArg1().then(function(result) {
            expect(result).toBe(arg1);
            done();
        });
    });

    test('addToArg2 method', function(done) {
        inst.addToArg2(4).then(function(result) {
            expect(result).toBe(arg2 + 4);
            done();
        });
    });

    test('getter: argumentOne', function(done) {
        inst.argumentOne.then(function(result) {
            expect(result).toBe(arg1);
            done();
        });
    });

    test('setter: newArgOneValue', function(done) {
        inst.newArgOneValue = 10;
        inst.argumentOne.then(function(result) {
            expect(result).toBe(10);
            done();
        });
    });

    test('static method', function(done) {
        TestInterfaceProxy.staticMethodSum(5, 6).then(function(result) {
            expect(result).toBe(11);
            done();
        });
    });

    test('static getter', function(done) {
        TestInterfaceProxy.staticGetter.then(function(result) {
            expect(result).toBe('hello world');
            done();
        });
    });

    test('should call click handler', function(done) {
        inst.addEventListener('click', function() {
            done();
        });

        inst.emitEvent('click');
    });

    test('should call click handler twice', function(done) {
        var timesCalled = 0;
        inst.addEventListener('click', function() {
            timesCalled++;
            if (timesCalled === 2) {
                done();
            }
        });

        inst.emitEvent('click');
        inst.emitEvent('click');
    });

    test('should only call close handler', function(done) {
        inst.addEventListener('click', function() {
            // shouldn't hit here
            expect(false).toBe(true);
        });

        inst.addEventListener('close', function() {
            done();
        });

        inst.emitEvent('close');
    });

    test('should not emit event addEventHandler', function(done) {
        inst.addEventListener('click', function() {
            // shouldn't hit here
            expect(false).toBe(true);
        });

        inst.emitEvent('wrong-event');
        setTimeout(done, 500);
    });

    test('should not call click handler after removed', function(done) {
        function onClick() {
            // shouldn't hit here
            expect(true).toBe(false);
        }
        inst.addEventListener('click', onClick);
        inst.removeEventListener('click', onClick);
        inst.emitEvent('click');
        setTimeout(done, 500);
    });

    test('should call click handler after add, remove, add', function(done) {
        function onClick() {
            done();
        }
        inst.addEventListener('click', onClick);
        inst.removeEventListener('click', onClick);
        inst.addEventListener('click', onClick);
        inst.emitEvent('click');
    });
});

describe('proxy test with multiple instances...', function() {
    var inst1, inst2;
    var TestInterfaceProxy;

    const arg1 = 3, arg2 = 2;

    beforeEach(function() {
        TestInterfaceProxy = createProxy(testInterface);
        inst1 = new TestInterfaceProxy(arg1, arg2);
        inst2 = new TestInterfaceProxy(arg1, arg2);
    });

    test('should have indepdendent setters', function(done) {
        inst1.newArgOneValue = 10;
        inst2.newArgOneValue = 5;
        inst1.argumentOne.then(function(result) {
            expect(result).toBe(10);
            inst2.argumentOne.then(function(result) {
                expect(result).toBe(5);
                done();
            });
        });
    });

    test('should only call event handler for inst2', function(done) {
        inst1.addEventListener('click', function() {
            // shouldn't hit here
            expect(true).toBe(false);
        });
        inst2.addEventListener('click', function() {
            done();
        });

        inst2.emitEvent('click');
    });

    test('should call event handler for inst1 and inst2', function(done) {
        let isInst1Clicked = false;
        let isInst2Clicked = false;
        inst1.addEventListener('click', function() {
            if (isInst1Clicked) { return; }
            isInst1Clicked = true;
            clicked();
        });
        inst2.addEventListener('click', function() {
            if (isInst2Clicked) { return; }
            isInst2Clicked = true;
            clicked();
        });

        function clicked() {
            if (isInst1Clicked && isInst1Clicked) {
                done();
            }
        }

        inst1.emitEvent('click');
        inst2.emitEvent('click');
    });
});

describe('proxy destroy tests...', function() {
    var inst, arg1 = 5, arg2 = 4;
    var TestInterfaceProxy;

    beforeEach(function() {
        TestInterfaceProxy = createProxy(testInterface);
        inst = new TestInterfaceProxy(arg1, arg2);
    });

    test('can not use inst after destroy is invoked', function(done) {
        inst.destroy();

        inst.getArg1()
        .then(function() {
            // shouldn't get here
        })
        .catch(function(err) {
            expect(err).toBe('method called failed: calling obj is not present')
            done();
        });
    });

    test('destroy from implementation side', function() {
        inst.close();

        inst.getArg1()
        .then(function() {
            // shouldn't get here
        })
        .catch(function(err) {
            expect(err).toBe('method called failed: calling obj is not present')
            done();
        });
    });
});
