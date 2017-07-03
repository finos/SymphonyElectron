const Application = require('../app');
const assert = require('assert');
const path = require('path');

describe('Tests for Activity Detection', () => {
    let app;

    before(() => {
        app = new Application({});
    });

    after(() => {
        if (app && app.isRunning()) {
            return app.stop();
        }
    });

    it('should launch the app', () => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            app.client.waitUntilWindowLoaded().getWindowCount()
                .should.eventually.equal(1);
        });
    });

    it('should check window count', () => {
        return app.client.windowHandles().then(function (response) {
            assert.equal(response.value.length, 1)
        });
    });

    it('should check browser window visibility', () => {
        return app.browserWindow.isVisible().then(function (visible) {
            assert.equal(visible, true);
        });
    });

    it('should check is always on top', () => {
        return app.browserWindow.isAlwaysOnTop().then(function (isAlwaysOnTop) {
            assert.equal(isAlwaysOnTop, false);
        });
    });

    it('should change the always on top property', () => {
        return app.browserWindow.setAlwaysOnTop(true);
    });

    it('should check is always on top to be true', () => {
        return app.browserWindow.isAlwaysOnTop().then(function (isAlwaysOnTop) {
            assert.equal(isAlwaysOnTop, true);
        });
    });

});