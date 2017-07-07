const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const Application = require('./spectron/spectronSetup');
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
                app.browserWindow.setFullScreen(false);
                done();
            }).catch((err) => {
                expect(err).toBeNull();
            });
        });
    });

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

    it('should set the app full screen and check whether it is in full screen', () => {
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
        robot.keyTap('enter');

        return app.browserWindow.isFullScreen().then((fullscreen) => {
            expect(fullscreen).toBeTruthy();
        }).catch((err) => {
            expect(err).toBeNull();
        })
    });
});