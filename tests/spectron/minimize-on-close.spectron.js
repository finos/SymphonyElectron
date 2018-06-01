const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');

let configPath;
let app = new Application({});

describe('Tests for Minimize on Close', () => {

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
                done.fail(new Error(`minimize-on-close failed in getWindowCount with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check window count', (done) => {
        return app.client.getWindowCount().then((count) => {
            expect(count === 1).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in getWindowCount with error: ${err}`));
        });
    });

    it('should check browser window visibility', (done) => {
        return app.browserWindow.isVisible().then((isVisible) => {
            expect(isVisible).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in isVisible with error: ${err}`));
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

    it('should check whether the app is minimized', (done) => {
        Application.readConfig(configPath).then((userConfig) => {
            if (isMac) {
                if (userConfig.minimizeOnClose) {
                    robot.setKeyboardDelay(100);
                    robot.keyToggle('w', 'down', ['command']);
                    robot.keyToggle('w', 'up');
                    robot.keyToggle('command', 'up');
                    app.browserWindow.isMinimized().then(function (minimized) {
                        expect(minimized).toBeTruthy();
                        done();
                    }).catch((err) => {
                        done.fail(new Error(`minimize-on-close failed in isMinimized with error: ${err}`));
                    });
                } else {

                    robot.setMouseDelay(100);
                    robot.moveMouseSmooth(200, 10);
                    robot.mouseClick();
                    robot.setKeyboardDelay(100);

                    // Key tap 8 times as "Minimize on Close" is in the
                    // 8th position under view menu item
                    for (let i = 0; i < 8; i++) {
                        robot.keyTap('down');
                    }
                    robot.keyTap('enter');

                    robot.keyToggle('w', 'down', ['command']);
                    robot.keyToggle('w', 'up');
                    robot.keyToggle('command', 'up');
                    app.browserWindow.isMinimized().then(function (minimized) {
                        expect(minimized).toBeTruthy();
                        done();
                    }).catch((err) => {
                        done.fail(new Error(`minimize-on-close failed in isMinimized with error: ${err}`));
                    });
                }
            } else {
                if (!userConfig.minimizeOnClose) {
                    app.browserWindow.getBounds().then((bounds) => {
                        robot.setMouseDelay(100);
                        let x = bounds.x + 95;
                        let y = bounds.y + 35;
                        robot.moveMouse(x, y);
                        robot.mouseClick();
                        // Key tap 5 times as "Minimize on Close" is in the
                        // 5th position under Window menu item
                        for (let i = 0; i < 5; i++) {
                            robot.keyTap('down');
                        }
                        robot.keyTap('enter');

                        robot.keyToggle('w', 'down', ['control']);
                        robot.keyToggle('w', 'up');
                        robot.keyToggle('control', 'up');
                        app.browserWindow.isMinimized().then(function (minimized) {
                            expect(minimized).toBeTruthy();
                            done();
                        }).catch((err) => {
                            done.fail(new Error(`minimize-on-close failed in isMinimized with error: ${err}`));
                        });
                    });
                } else {
                    app.browserWindow.getBounds().then((bounds) => {
                        robot.setMouseDelay(100);
                        let x = bounds.x + 200;
                        let y = bounds.y + 200;
                        robot.moveMouseSmooth(x, y);
                        robot.mouseClick();
                        robot.keyToggle('w', 'down', ['control']);
                        robot.keyToggle('w', 'up');
                        robot.keyToggle('control', 'up');
                        app.browserWindow.isMinimized().then(function (minimized) {
                            expect(minimized).toBeTruthy();
                            done();
                        }).catch((err) => {
                            done.fail(new Error(`minimize-on-close failed in isMinimized with error: ${err}`));
                        });
                    });
                }
            }
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in readConfig with error: ${err}`));
        })
    });

});
