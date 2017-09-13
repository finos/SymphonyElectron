const Application = require('./spectronSetup');
let app = new Application({});

describe('Tests for Bring to front', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            done();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    afterAll((done) => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.stop().then(() => {
                done();
            }).catch((err) => {
                done();
            });
        }
    });

    it('should launch the app', (done) => {
        return app.client.waitUntilWindowLoaded().then(() => {
            return app.client.getWindowCount().then((count) => {
                expect(count === 1).toBeTruthy();
                done();
            }).catch((err) => {
                expect(err).toBeNull();
            });
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should minimize the app', () => {
        return app.browserWindow.minimize().then(() => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeTruthy();
            }).catch((err) => {
                expect(err).toBeNull();
            });
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should not be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeFalsy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should maximize browser window', () => {
        return app.browserWindow.restore().then(() => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeFalsy();
            }).catch((err) => {
                expect(err).toBeNull();
            });
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

});