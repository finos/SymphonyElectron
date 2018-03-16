const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');

let configPath;

let app = new Application({});

describe('Tests for Zoom in and Zoom out', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            getConfigPath().then((config) => {
                configPath = config;
                done();
            }).catch((err) => {
                done.fail(new Error(`Unable to start application error: ${err}`));
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
                done.fail(new Error(`zoom-in-zoom-out failed in getWindowCount with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`zoom-in-zoom-out failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check window count', (done) => {
        return app.client.getWindowCount().then((count) => {
            expect(count === 1).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`zoom-in-zoom-out failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check browser window visibility', (done) => {
        return app.browserWindow.isVisible().then((isVisible) => {
            expect(isVisible).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`zoom-in-zoom-out failed in isVisible with error: ${err}`));
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

    it('should zoom in the app and check whether it is zoomed in', (done) => {
        robot.setKeyboardDelay(500);
        if (isMac) {

            robot.keyToggle('0', 'down', ['command']);
            robot.keyToggle('0', 'up');
            robot.keyToggle('command', 'up');

            for (let i = 0; i < 4; i++) {
                robot.keyToggle('+', 'down', ['command']);
            }
            robot.keyToggle('+', 'up');
            robot.keyToggle('command', 'up');

            return app.electron.webFrame.getZoomFactor().then((zoomFactor) => {
                expect(zoomFactor > 1).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`zoom-in-zoom-out failed in getZoomFactor with error: ${err}`));
            })
        } else {
            return app.browserWindow.getBounds().then((bounds) => {
                robot.setMouseDelay(100);
                let x = bounds.x + 200;
                let y = bounds.y + 200;
                robot.moveMouseSmooth(x, y);
                robot.mouseClick();

                robot.keyToggle('0', 'down', ['control']);
                robot.keyToggle('0', 'up');
                robot.keyToggle('control', 'up');

                for (let i = 0; i < 4; i++) {
                    robot.keyToggle('+', 'down', ['control', 'shift']);
                }
                robot.keyToggle('+', 'up');
                robot.keyToggle('control', 'up');
                robot.keyToggle('shift', 'up');

                return app.electron.webFrame.getZoomFactor().then((zoomFactor) => {
                    expect(zoomFactor > 1).toBeTruthy();
                    done();
                }).catch((err) => {
                    done.fail(new Error(`zoom-in-zoom-out failed in getBounds with error: ${err}`));
                })
            });
        }
    });


    it('should zoom out the app and check whether it is zoomed out', () => {
        robot.setKeyboardDelay(500);
        if (isMac) {

            robot.keyToggle('0', 'down', ['command']);
            robot.keyToggle('0', 'up');
            robot.keyToggle('command', 'up');

            for (let i = 0; i < 4; i++) {
                robot.keyToggle('-', 'down', ['command']);
            }
            robot.keyToggle('-', 'up');
            robot.keyToggle('command', 'up');

            return app.electron.webFrame.getZoomFactor().then((zoomFactor) => {

                expect(zoomFactor < 1).toBeTruthy();
            }).catch((err) => {
                expect(err).toBeNull();
            })
        } else {
            return app.browserWindow.getBounds().then((bounds) => {
                robot.setMouseDelay(100);
                let x = bounds.x + 200;
                let y = bounds.y + 200;
                robot.moveMouseSmooth(x, y);
                robot.mouseClick();

                robot.keyToggle('0', 'down', ['control']);
                robot.keyToggle('0', 'up');
                robot.keyToggle('control', 'up');

                for (let i = 0; i < 4; i++) {
                    robot.keyToggle('-', 'down', ['control']);
                }
                robot.keyToggle('-', 'up');
                robot.keyToggle('control', 'up');

                return app.electron.webFrame.getZoomFactor().then((zoomFactor) => {
                    expect(zoomFactor < 1).toBeTruthy();
                }).catch((err) => {
                    expect(err).toBeNull();
                })
            });
        }
    });
});
