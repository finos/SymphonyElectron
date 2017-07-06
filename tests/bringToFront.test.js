describe('Tests for Bring to front', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90000;

    let app;

    beforeAll((done) => {
        const Application = require('./utils/spectronSetup');
        app = new Application({});
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            done();
        }).catch(() => {
            expect(true).toBe(false);
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
            }).catch(() => {
                expect(true).toBe(false);
            });
        }).catch(() => {
            expect(true).toBe(false);
        });
    });

    it('should minimize the app', () => {
        return app.browserWindow.minimize().then(() => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeTruthy();
            }).catch(() => {
                expect(true).toBe(false);
            });
        }).catch(() => {
            expect(true).toBe(false);
        });
    });

    it('should not be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeFalsy();
        }).catch(() => {
            expect(true).toBe(false);
        });
    });

    it('should maximize browser window', () => {
        return app.browserWindow.restore().then(async () => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeFalsy();
            }).catch(() => {
                expect(true).toBe(false);
            });
        }).catch(() => {
            expect(true).toBe(false);
        });
    });

    it('should be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeTruthy();
        }).catch(() => {
            expect(true).toBe(false);
        });
    });

});