const Application = require('./spectronSetup');

describe('Tests for Bring to front', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    let app;

    beforeAll(() => {
        app = new Application({});
    });

    afterAll(() => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            return app.stop();
        }
    });

    it('should launch the app', () => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            return app.client.waitUntilWindowLoaded().then(async () => {
                const count = await app.client.getWindowCount();
                expect(count === 1).toBeTruthy();
            })
        });
    });

    it('should minimize the app', () => {
        return app.browserWindow.minimize().then(async () => {
            const isMinimized = await app.browserWindow.isMinimized();
            expect(isMinimized).toBeTruthy();
        })
    });

    it('should not be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeFalsy();
        });
    });

    it('should maximize browser window', () => {
        return app.browserWindow.restore().then(async () => {
            const isMinimized = await app.browserWindow.isMinimized();
            expect(isMinimized).toBeFalsy();
        });
    });

    it('should be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            expect(isFocused).toBeTruthy();
        });
    });

});