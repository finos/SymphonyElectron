const Application = require('./spectronSetup');
const { isMac, isWindowsOS } = require('../../js/utils/misc');
const WindowsActions = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const Utils = require('./spectronUtils');
let mainApp = new Application({});
let app, wActions, config, userConfig;

describe('Add Test To Verify Minimize on Close', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

    beforeAll(async (done) => {
        try {
            app = await mainApp.startApplication({ alwaysOnTop: false });
            await Utils.sleep(2);
            wActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            config = await getConfigPath(app);
            await wActions.focusWindow();
            await done();
        } catch (err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    function getConfigPath(app) {
        return new Promise(function (resolve, reject) {
            app.client.addCommand('getUserDataPath', function () {
                return app.client.execute(function () {
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
            await Utils.killProcess("chromedriver.exe");
            await Utils.killProcess("electron.exe");   
            done();              
        } catch (error) {         
          done.fail(new Error(`After all: ${error}`));           
        }
    });

    /**
    * Verify Minimize on Close option once the application is installed
    * TC-ID: 3084609
    * Cover scenarios in AVT-939
    */
    it('Verify Minimize on Close option once the application is installed', async (done) => {

        try {
            userConfig = await Application.readConfig(config);
            if (userConfig.minimizeOnClose == false) {
                await wActions.openMinimizeAndClose(1, 1);
                await wActions.verifyMinimizeWindows();
                await done();
            }
            else {
                wActions.openMinimizeAndClose(2, 1);
                await wActions.verifyMinimizeWindows();
                await done();
            }

        } catch (err) {
            done.fail(new Error(`Verify Minimize on Close option once the application is installed: ${err}`));

        };

    });

    /**
    * Close window when 'Minimize on Close' is ON
    * TC-ID: 2911252
    * Cover scenarios in AVT-937
    */
    it('Close window when "Minimize on Close" is ON', async (done) => {

        try {
            await wActions.bringToFront("Symphony");
            await wActions.openMinimizeAndClose(2, 1);
            await wActions.verifyMinimizeWindows();
            await wActions.bringToFront("Symphony");
            await Utils.sleep(2);
            if (!isMac)
            {    
                await wActions.pressCtrlW();
            }
            else
            {
                await wActions.pressCtrlWOnMac();
            }
            await wActions.verifyMinimizeWindows();
            await done();
        } catch (err) {
            done.fail(new Error(`Close window when "Minimize on Close" is ON: ${err}`));
        };

    });

    /**
    * Verify by deselecting Minimize on Close option once the application is launched
    * TC-ID: 3084612
    * Cover scenarios in AVT-938
    */
    it('Verify by deselecting Minimize on Close option once the application is launched', async (done) => {

        try {
            await wActions.bringToFront("Symphony");
            let count = await app.client.getWindowCount();
            await wActions.openMinimizeAndClose(1, 1);
            try {
                count = await app.client.getWindowCount();
            }
            catch (err1) {
                count = 0;
            }
            finally {
                if (!isMac) {
                    await expect(count === 0).toBeTruthy();
                }
                else {
                    await expect(count === 1).toBeTruthy();
                }                
                await done();
            }
        } catch (err) {
            done.fail(new Error(`should check whether the app is minimized: ${err}`));
        };
    })
})
