const Application = require('../app');
const assert = require('assert');

describe('Tests for Bring to front', () => {
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

    it('should minimize the app', () => {
        return app.browserWindow.minimize();
    });

    it('should not be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            assert.equal(isFocused, false);
        });
    });

    it('should maximize browser window', () => {
        return app.browserWindow.restore();
    });

    it('should be focused', () => {
        return app.browserWindow.isFocused().then((isFocused) => {
            assert.equal(isFocused, true);
        });
    });

});