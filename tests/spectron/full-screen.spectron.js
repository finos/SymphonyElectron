const childProcess = require('child_process');
const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const constants = require('./spectronConstants');

let robot;
let configPath;
let app = new Application({});

describe('Tests for Full screen', () => {

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

    it('should set the app full screen and check whether it is in full screen', () => {
        if (isMac) {
            robot.setMouseDelay(100);
            robot.moveMouseSmooth(205, 10);
            robot.mouseClick();
            robot.setKeyboardDelay(100);

            // Key tap 8 times as "Enter Full Screen" is in the
            // 8th position under view menu item
            for (let i = 0; i < 8; i++) {
                robot.keyTap('down');
            }
            robot.keyTap('enter');

            return app.browserWindow.isFullScreen().then((fullscreen) => {
                expect(fullscreen).toBeTruthy();
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

                robot.keyTap('f11');

                return app.browserWindow.isFullScreen().then((fullscreen) => {
                    expect(fullscreen).toBeTruthy();
                }).catch((err) => {
                    expect(err).toBeNull();
                })
            });
        }
    });
});