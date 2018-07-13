const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');

let configPath;
let app = new Application({});

describe('Tests for Full screen', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            getConfigPath().then((config) => {
                configPath = config;
                done();
            }).catch((err) => {
                done.fail(new Error(`full-screen failed in getConfigPath with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`Unable to start application error: ${err}`));
        });
    });

    function getConfigPath() {
        return new Promise(function (resolve, reject) {
            app.client.addCommand('getUserDataPath', function () {
                return this.execute(function () {
                    return require('electron').remote.app.getPath('userData');
                })
            });
            app.client.getUserDataPath().then((userConfigPath) => {
                resolve(userConfigPath.value)
            }).catch((err) => {
                reject(err);
            });
        });
    }

    afterAll((done) => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.client.getWindowCount().then((count) => {
                if (count > 0) {
                    app.stop().then(() => {
                        done();
                    }).catch((err) => {
                        done();
                    });
                } else {
                    done();
                }
            })
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
                done.fail(new Error(`full-screen failed in getWindowCount with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`full-screen failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check window count', (done) => {
        return app.client.getWindowCount().then((count) => {
            expect(count === 1).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`full-screen failed in getWindowCount with error: ${err}`));
        });
    });

    it('should check browser window visibility', (done) => {
        return app.browserWindow.isVisible().then((isVisible) => {
            expect(isVisible).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`full-screen failed in getWindowCount with error: ${err}`));
        });
    });

    it('should bring the app to top', () => {
        app.browserWindow.focus();
        return app.browserWindow.setAlwaysOnTop(true).then(() => {
            return app.browserWindow.isAlwaysOnTop().then((isOnTop) => {
                expect(isOnTop).toBeTruthy();
            });
        });
    });

    it('should set the app full screen and check whether it is in full screen', (done) => {
        if (isMac) {
            robot.setMouseDelay(100);
            robot.moveMouseSmooth(205, 10);
            robot.mouseClick();
            robot.setKeyboardDelay(100);

            // Key tap 5 times as "Enter Full Screen" is in the
            // 5th position under view menu item
            for (let i = 0; i < 5; i++) {
                robot.keyTap('down');
            }
            robot.keyTap('enter');

            return app.browserWindow.isFullScreen().then((fullscreen) => {
                expect(fullscreen).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`full-screen failed in isFullScreen with error: ${err}`));
            })
        } else {
            return app.browserWindow.getBounds().then((bounds) => {
                robot.setMouseDelay(100);
                let x = bounds.x + 200;
                let y = bounds.y + 200;
                robot.moveMouse(x, y);
                robot.mouseClick("left");

                robot.keyTap('f11');

                return app.browserWindow.isFullScreen().then((fullscreen) => {
                    expect(fullscreen).toBeTruthy();
                    done();
                }).catch((err) => {
                    done.fail(new Error(`full-screen failed in isFullScreen with error: ${err}`));
                })
            });
        }
    });
});
