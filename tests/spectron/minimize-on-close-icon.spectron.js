const Application = require('./spectronSetup');
const { isMac, isWindowsOS } = require('../../js/utils/misc');
const WindowsActions = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const Utils = require('./spectronUtils');
let mainApp = new Application({});
let app, wActions, config;



!isMac? describe('Add Test To Verify Minimize on Close', () => {   
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();
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
            if (app && app.isRunning()) {                 
                done();         
                wActions.closeChrome();    
            }                   
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
        if (isWindowsOS) {
            try {
                let userConfig = await Application.readConfig(config);
                await wActions.openMenu(["Window", "Minimize on Close"]);
                if (userConfig.minimizeOnClose != false) {
                    await wActions.openMenu(["Window", "Minimize on Close"]);
                }
                await wActions.openMenu(["Window", "Close"]);
                await wActions.verifyMinimizeWindows();
                await done();
            } catch (err) {
                done.fail(new Error(`Verify Minimize on Close option once the application is installed: ${err}`));
            };
        }
        else {
            await done();
        }
    });

    /**
    * Close window when 'Minimize on Close' is ON
    * TC-ID: 2911252
    * Cover scenarios in AVT-937
    */
    it('Close window when "Minimize on Close" is ON', async (done) => {
        if (isWindowsOS) {
            try {
                let userConfig = await Application.readConfig(config);
                await wActions.focusWindow();
                await wActions.openMenu(["Window", "Minimize on Close"]);
                if (userConfig.minimizeOnClose != false) {
                    await wActions.openMenu(["Window", "Minimize on Close"]);
                }
                await wActions.openMenu(["Window", "Close"])
                await wActions.verifyMinimizeWindows();

                await wActions.focusWindow();
                await wActions.bringToFront("");
                await Utils.sleep(2);
                await wActions.pressCtrlW();

                await wActions.verifyMinimizeWindows();
                await done()
            } catch (err) {
                done.fail(new Error(`Close window when "Minimize on Close" is ON: ${err}`));
            };
        }
        else {
            await done();
        }
    });

    /**
    * Verify by deselecting Minimize on Close option once the application is launched
    * TC-ID: 3084612
   * Cover scenarios in AVT-938
   */
    it('Verify by deselecting Minimize on Close option once the application is launched', async (done) => {

        if (isWindowsOS) {
            try {
                let userConfig = await Application.readConfig(config);
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
                done.fail(new Error(`Verify by deselecting Minimize on Close option once the application is launched: ${err}`));
            };
        }
        else {
            await done();
        }
    });
}):describe.skip();
