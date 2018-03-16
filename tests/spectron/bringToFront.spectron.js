const Application = require('./spectronSetup');
const bluebird = require('bluebird');
const { isMac, isWindowsOS } = require('../../js/utils/misc');
const robot = require('robotjs');

let app = new Application({});

function blurBrowserWindow() {
    robot.setMouseDelay(200);
    robot.moveMouse(0, 100);
    robot.mouseClick();
}

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

    it('should launch the app and verify window count', (done) => {
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

    it('should minimize the app and verify if the window isMinimized', (done) => {
        return app.browserWindow.minimize().then(() => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`bringToFront failed in isMinimized with error: ${err}`));
            });
        });
    });

    it('should restore the browser window and verify window focus', (done) => {
        bluebird.all([
            blurBrowserWindow,
            app.browserWindow.restore,
            app.browserWindow.isMinimized,
            app.browserWindow.isFocused,
        ]).mapSeries((method) => {
            return method();
        }).then((results) => {
            if (isMac) {
                expect(results[2]).toBe(false);
                expect(results[3]).toBe(false);
            }

            if (isWindowsOS) {
                expect(results[2]).toBe(false);
                expect(results[3]).toBe(true);
            }
            done();
        }).catch((err) => {
            done.fail(new Error(`bringToFront failed to restore with error: ${err}`));
        });
    });

    it('should minimize and verify if the window isMinimized again', function () {
        return app.browserWindow.minimize().then(() => {
            return app.browserWindow.isMinimized().then((isMinimized) => {
                expect(isMinimized).toBeTruthy();
            }).catch((err) => {
                done.fail(new Error(`bringToFront failed to minimize with error: ${err}`));
            });
        });
    });

    it('should show the browser window and verify window focus', (done) => {
        bluebird.all([
            blurBrowserWindow,
            app.browserWindow.showInactive,
            app.browserWindow.isFocused
        ]).mapSeries((method) => {
            return method();
        }).then((results) => {
            if (isMac) {
                expect(results[2]).toBe(false);
            }

            if (isWindowsOS) {
                expect(results[2]).toBe(true);
            }
            done();
        }).catch((err) => {
            done.fail(new Error(`bringToFront failed to focus with error: ${err}`));
        });
    });

});