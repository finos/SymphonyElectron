const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const Application = require('./spectron/spectronSetup');
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
                    console.log(config);
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
            app.client.getWindowCount().then((count) => {
                if (count > 0) {
                    app.stop().then(() => {
                        done();
                    }).catch((err) => {
                        console.log(err);
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

    it('should check whether the app is minimized', (done) => {
        return Application.readConfig(configPath).then((userConfig) => {
            if (userConfig.minimizeOnClose) {
                robot.setKeyboardDelay(200);
                robot.keyToggle('w', 'down', ['command']);
                robot.keyToggle('w', 'up');
                return app.browserWindow.isMinimized().then(function (minimized) {
                    expect(minimized).toBeTruthy();
                    done();
                }).catch((err) => {
                    expect(err).toBeNull();
                });
            } else {

                robot.setMouseDelay(200);
                robot.moveMouseSmooth(205, 10);
                robot.mouseClick();
                robot.setKeyboardDelay(200);
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('enter');

                robot.keyToggle('w', 'down', ['command']);
                robot.keyToggle('w', 'up');
                return app.browserWindow.isMinimized().then(function (minimized) {
                    expect(minimized).toBeTruthy();
                    done();
                }).catch((err) => {
                    expect(err).toBeNull();
                    done();
                });
            }
        }).catch((err) => {
            expect(err).toBeNull();
            done();
        })
    });

});