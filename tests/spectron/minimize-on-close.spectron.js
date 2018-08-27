const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');
const WindowsActions = require('./spectronWindowsActions');
const Utils = require('./spectronUtils');
let configPath,wActions,app;
let  mainApp = new Application({});

!isMac? describe('Tests for Minimize on Close', () => {  
    
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

    beforeAll(async (done) => {
        try {
            app = await mainApp.startApplication({ alwaysOnTop: false });
            await Utils.sleep(2);
            wActions = await new WindowsActions(app);           
            configPath = await getConfigPath();
            await wActions.focusWindow();
            await done();
        } catch (err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
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

    afterAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        try {            
            if (app && app.isRunning()) {                
                done();         
                wActions.closeChrome();    
            }                   
        } catch (error) {         
          done.fail(new Error(`After all: ${error}`));         
           
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

    it('should check whether the app is minimized', async(done) => {
        try {
            let userConfig = await Application.readConfig(configPath);
            await wActions.focusWindow();
            await wActions.openMenu(["Window", "Minimize on Close"]);
            if (userConfig.minimizeOnClose == false) {
                await wActions.openMenu(["Window", "Minimize on Close"]);
            }
            await wActions.openMenu(["Window", "Close"])
            await Utils.sleep(5);
            let status = await wActions.isElectronProcessRunning() ;
            await console.log(status);
            await expect(status === false).toBeTruthy();
            await done();
        } catch (err) {
            done.fail(new Error(`should check whether the app is minimized: ${err}`));
        };   
    });

}) : describe.skip();
