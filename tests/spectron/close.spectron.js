const Application = require('./spectronSetup');

let app = new Application({});

describe('Tests for Close', () => {

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
        } else {
            done();
        }
    });

    it('should launch the app', (done) => {
        return app.client.waitUntilWindowLoaded().then(() => {
            return app.client.getWindowCount().then((count) => {
                expect(count === 1).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`close failed in getWindowCount with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`close failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check window count', (done) => {
        return app.client.getWindowCount().then((count) => {
            expect(count === 1).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`close failed in getWindowCount with error: ${err}`));
        });
    });

    it('should check browser window visibility', (done) => {
        return app.browserWindow.isVisible().then((isVisible) => {
            expect(isVisible).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`close failed in isVisible with error: ${err}`));
        });
    });

    it('should close the app', () => {
        return app.stop();
    });

    it('should check whether the app is running', () => {
        expect(app.isRunning()).toBe(false);
    });

});
