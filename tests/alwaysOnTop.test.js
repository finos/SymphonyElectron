const Application = require('./spectron/spectronSetup');
const {isMac} = require('../js/utils/misc.js');
const childProcess = require('child_process');

let app = new Application({});
let robot;
let configPath;

describe('Tests for Always on top', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        childProcess.exec(`npm rebuild robotjs --target=${process.version} --build-from-source`, function () {
            robot = require('robotjs');
            return app.startApplication().then((startedApp) => {
                app = startedApp;
                getConfigPath().then((config) => {
                    configPath = config;
                    done();
                }).catch((err) => {
                    expect(err).toBeNull();
                });
            }).catch((err) => {
                expect(err).toBeNull();
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
            app.client.getUserDataPath().then((path) => {
                resolve(path.value + '/Symphony.config')
            }).catch((err) => {
                reject(err);
            });
        });
    }

    afterAll((done) => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.stop().then(() => {
                childProcess.exec('npm run rebuild', function (err, stdout) {
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                    done();
                });
            }).catch((err) => {
                childProcess.exec('npm run rebuild', function () {
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                    expect(err).toBeNull();
                    done();
                });
            });
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

    it('should check is always on top', () => {
        return app.browserWindow.isAlwaysOnTop().then((isAlwaysOnTop) => {
            expect(isAlwaysOnTop).toBeFalsy();
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should toggle the always on top property to true', (done) => {
        if (isMac) {
            robot.setMouseDelay(200);
            robot.moveMouse(190, 0);
            robot.mouseClick();
            for (let i = 0; i < 8; i++) {
                robot.keyTap('down');
            }
            robot.keyTap('enter');
            setTimeout(() => {
                done();
            }, 5000)
        } else {
            app.browserWindow.getBounds().then((bounds) => {
                robot.setMouseDelay(200);
                let x = bounds.x + 95;
                let y = bounds.x + 95;
                robot.moveMouse(x, y);
                robot.mouseClick();
                for (let i = 0; i < 4; i++) {
                    robot.keyTap('down');
                }
                robot.keyTap('enter');
                setTimeout(() => {
                    done();
                }, 5000)
            });
        }
    });

    it('should check is always on top to be true', () => {
        return Application.readConfig(configPath).then((userData) => {
            if (userData.alwaysOnTop) {
                return app.browserWindow.isAlwaysOnTop().then((isAlwaysOnTop) => {
                    expect(isAlwaysOnTop).toBeTruthy();
                }).catch((err) => {
                    expect(err).toBeNull();
                });
            } else {
                return app.browserWindow.isAlwaysOnTop().then((isAlwaysOnTop) => {
                    expect(isAlwaysOnTop).toBeFalsy();
                }).catch((err) => {
                    expect(err).toBeNull();
                });
            }
        });
    });

    it('should toggle the always on top property to false', (done) => {
        if (isMac) {
            robot.setMouseDelay(200);
            robot.moveMouse(190, 0);
            robot.mouseClick();
            for (let i = 0; i < 8; i++) {
                robot.keyTap('down');
            }
            robot.keyTap('enter');
            setTimeout(() => {
                done();
            }, 5000);
        } else {
            app.browserWindow.getBounds().then((bounds) => {
                robot.setMouseDelay(200);
                let x = bounds.x + 95;
                let y = bounds.x + 95;
                robot.moveMouse(x, y);
                robot.mouseClick();
                for (let i = 0; i < 4; i++) {
                    robot.keyTap('down');
                }
                robot.keyTap('enter');
                setTimeout(() => {
                    done();
                }, 5000)
            });
        }
    });

    it('should check is always on top to be true', () => {
        return Application.readConfig(configPath).then((userData) => {
            if (userData.alwaysOnTop) {
                return app.browserWindow.isAlwaysOnTop().then((isAlwaysOnTop) => {
                    expect(isAlwaysOnTop).toBeTruthy();
                }).catch((err) => {
                    expect(err).toBeNull();
                });
            } else {
                return app.browserWindow.isAlwaysOnTop().then((isAlwaysOnTop) => {
                    expect(isAlwaysOnTop).toBeFalsy();
                }).catch((err) => {
                    expect(err).toBeNull();
                });
            }
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

});
