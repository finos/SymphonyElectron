const Application = require('../app');
const assert = require('assert');

describe('Tests for Always on Top', () => {
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

    it('should check isAlwaysOnTop', () => {
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

});