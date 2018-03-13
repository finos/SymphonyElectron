const Application = require('./spectronSetup');
const constants = require('./spectronConstants');

let app = new Application({});

describe('Tests for Bring to front', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            done();
        }).catch((err) => {
            done.fail(new Error(`Unable to start application error: ${err}`));
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
                done.fail(new Error(`bringToFront failed in getWindowCount with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`bringToFront failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should minimize the app', (done) => {
        return app.browserWindow.minimize().then(() => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`bringToFront failed in isMinimized with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`bringToFront failed in minimize with error: ${err}`));
        });
    });

    it('should not be focused', (done) => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeFalsy();
            done();
        }).catch((err) => {
            done.fail(new Error(`bringToFront failed in isFocused with error: ${err}`));
        });
    });

    it('should maximize browser window', (done) => {
        return app.browserWindow.restore().then(() => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeFalsy();
                done();
            }).catch((err) => {
                done.fail(new Error(`bringToFront failed in isMinimized with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`bringToFront failed in restore with error: ${err}`));
        });
    });

    it('should be focused', (done) => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`bringToFront failed in isFocused with error: ${err}`));
        });
    });

});
