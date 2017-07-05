const Application = require('./spectronSetup');
const path = require('path');

describe('Tests for Always on top', () => {

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

    it('should check window count', async () => {
        const count = await app.client.getWindowCount();
        expect(count === 1).toBeTruthy();
    });

    it('should check browser window visibility', async () => {
        const isVisible = await app.browserWindow.isVisible();
        expect(isVisible).toBeTruthy();
    });

    it('should check is always on top', async () => {
        const isAlwaysOnTop = await app.browserWindow.isAlwaysOnTop();
        expect(isAlwaysOnTop).toBeFalsy();
    });

    it('should change the always on top property', () => {
        return app.browserWindow.setAlwaysOnTop(true);
    });

    it('should check is always on top to be true', async () => {
        const isAlwaysOnTop = await app.browserWindow.isAlwaysOnTop();
        expect(isAlwaysOnTop).toBeTruthy();
    });

});