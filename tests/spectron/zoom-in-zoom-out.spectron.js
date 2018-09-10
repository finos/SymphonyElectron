const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');
const WindowsActions = require('./spectronWindowsActions');
let app, config,wActions;
let mainApp = new Application({});
const Utils = require('./spectronUtils');

describe('Tests for Zoom in and Zoom out', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            app = await mainApp.startApplication({ alwaysOnTop: false });
            await Utils.sleep(2);
            wActions = await new WindowsActions(app);
            config = await getConfigPath(app);
            await done();
        } catch (err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    function getConfigPath(app) {
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
        // Get it back normal size      
        if (!isMac) {
            for (let i = 0; i < 4; i++) {
                robot.keyToggle('+', 'down', ['control', 'shift']);
            }
            robot.keyToggle('+', 'up');
            robot.keyToggle('control', 'up');
            robot.keyToggle('shift', 'up');
        }

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

    it('should zoom in the app and check whether it is zoomed in', async (done) => {
        if (!isMac) {
            await robot.setKeyboardDelay(500);
            let bounds = await app.browserWindow.getBounds();            
            await robot.setMouseDelay(100);
            let x = await bounds.x + 200;
            let y = await bounds.y + 200;
            await robot.moveMouse(x, y);
            await robot.mouseClick();

            await robot.keyToggle('0', 'down', ['control']);
            await robot.keyToggle('0', 'up',['control']);          

            for (let i = 0; i < 4; i++) {
                await robot.keyToggle('+', 'down', ['control', 'shift']);
                await robot.keyToggle('+', 'up', ['control', 'shift']);
            }           
            let zoomFactor = await app.electron.webFrame.getZoomFactor()
            await expect(zoomFactor > 1).toBeTruthy();
            await done();
        }
        else {          
            let x = 200;
            let y = 200;
            await robot.moveMouse(x, y);
            await robot.mouseClick();
            await robot.keyToggle('0', 'down', ['command']);
            await robot.keyToggle('0', 'up', ['command']);
            for (let i = 0; i < 4; i++) {
                await robot.keyToggle('+', 'down', ['command']);
                await robot.keyToggle('+', 'up', ['command']);
            }
            let zoomFactor = await app.electron.webFrame.getZoomFactor()
            await expect(zoomFactor > 1).toBeTruthy();
            await done();
        }
    });


    it('should zoom out the app and check whether it is zoomed out', async (done) => {
        if (!isMac) {
            await robot.setKeyboardDelay(500);
            let bounds = await app.browserWindow.getBounds();
            await robot.setMouseDelay(100);
            let x = await bounds.x + 200;
            let y = await bounds.y + 200;
            await robot.moveMouse(x, y);
            await robot.mouseClick();

            await robot.keyToggle('0', 'down', ['control']);
            await robot.keyToggle('0', 'up');
            await robot.keyToggle('control', 'up');

            for (let i = 0; i < 4; i++) {
                await robot.keyToggle('-', 'down', ['control']);
            }
            await robot.keyToggle('-', 'up');
            await robot.keyToggle('control', 'up');

            let zoomFactor = await app.electron.webFrame.getZoomFactor()
            await expect(zoomFactor < 1).toBeTruthy();
            await done();
        }
        else {
            let x = 200;
            let y = 200;
            await robot.moveMouse(x, y);
            await robot.mouseClick();
            await robot.keyToggle('0', 'down', ['command']);
            await robot.keyToggle('0', 'up', ['command']);
            for (let i = 0; i < 4; i++) {
                await robot.keyToggle('-', 'down', ['command']);
                await robot.keyToggle('-', 'up', ['command']);
            }
            let zoomFactor = await app.electron.webFrame.getZoomFactor()
            await expect(zoomFactor < 1).toBeTruthy();
            await done();
        }
    });
});
