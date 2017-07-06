const Application = require('./spectron/spectronSetup');
let app = new Application({});

describe('Tests for Always on top', () => {

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
                console.log(err);
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

    it('should check window count', () => {
        return app.client.getWindowCount().then((count) => {
            expect(count === 1).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should check browser window visibility', () => {
        return app.browserWindow.isVisible().then((isVisible) => {
            expect(isVisible).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should check is always on top', async () => {
        return app.browserWindow.isAlwaysOnTop().then((isAlwaysOnTop) => {
            expect(isAlwaysOnTop).toBeFalsy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should change the always on top property', () => {
        return app.browserWindow.setAlwaysOnTop(true);
    });

    it('should check is always on top to be true', () => {
        return app.browserWindow.isAlwaysOnTop().then((isAlwaysOnTop) => {
            expect(isAlwaysOnTop).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

});