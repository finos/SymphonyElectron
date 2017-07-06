describe('Tests for Full Screen', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90000;

    let app;

    beforeAll((done) => {
        const Application = require('./spectron/spectronSetup');
        app = new Application({});
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
        } else {
            done();
        }
    });

    it('should launch the app', (done) => {
        return app.client.waitUntilWindowLoaded().then(() => {
            app.browserWindow.setFullScreen(false);
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

    it('should set the app full screen', () => {
        return app.browserWindow.setFullScreen(true);
    });

    it('should check whether the app is in full screen', () => {
        return app.browserWindow.isFullScreen().then((isFullScreen) => {
            expect(isFullScreen).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

});