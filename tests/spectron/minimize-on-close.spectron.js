const childProcess = require('child_process');
const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const constants = require('./spectronConstants');

let robot;
let configPath;
let app = new Application({});

describe('Tests for Minimize on Close', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 90000;

    beforeAll((done) => {
        childProcess.exec(`npm rebuild robotjs --target=${process.version} --build-from-source`, function () {
            robot = require('robotjs');
            return app.startApplication().then((startedApp) => {
                app = startedApp;
                getConfigPath().then((config) => {
                    configPath = config;
                    done();
                }).catch((err) => {
                    console.error(`Unable to get user config path error: ${err}`);
                    expect(err).toBeNull();
                    done();
                });
            }).catch((err) => {
                console.error(`Unable to start application error: ${err}`);
                expect(err).toBeNull();
                done();
            });
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
                expect(err).toBeNull();
            });
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should check window count', () => {
        return app.client.getWindowCount().then((count) => {
            expect(count === 1).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should check browser window visibility', () => {
        return app.browserWindow.isVisible().then((isVisible) => {
            expect(isVisible).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
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
                        expect(err).toBeNull();
                        done();
                    });
                } else {

                    robot.setMouseDelay(100);
                    robot.moveMouseSmooth(200, 10);
                    robot.mouseClick();
                    robot.setKeyboardDelay(100);

                    // Key tap 9 times as "Minimize on Close" is in the
                    // 9th position under view menu item
                    for (let i = 0; i < 9; i++) {
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
                        expect(err).toBeNull();
                        done();
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
                            expect(err).toBeNull();
                            done();
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
                            expect(err).toBeNull();
                            done();
                        });
                    });
                }
            }
        }).catch((err) => {
            expect(err).toBeNull();
            done();
        })
    });

});