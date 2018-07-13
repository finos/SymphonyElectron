const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');
const WindowsAction = require('./spectronWindowsActions');

let configPath;
let app = new Application({
    startTimeout: Application.getTimeOut(),
    waitTimeout: Application.getTimeOut()
});
let wActions;
describe('Verify by deselecting Minimize on Close', () => {

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
            wActions = new WindowsAction(app);
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
   
    /**
     * Keep size and position of the windows in previous session
     * TC-ID: 3084612
    * Cover scenarios in AVT-938
    */
    it('Verify by deselecting Minimize on Close option once the application is launched', async (done) => {
        await Application.readConfig(configPath).then(async (userConfig) => {
            if (isMac) {
                done();
            }
            else {
                //When app does not tick on Minimize On Close Menu Item
                //Select 2 times to perform for un-ticking Menu 
                if (userConfig.minimizeOnClose == false) {
                    await wActions.selectMinimizeOnClose();
                    await wActions.selectMinimizeOnClose();
                    await wActions.closeWindowByClick();
                    await wActions.verifyMinimizeWindows();
                }
                //When app  ticked on Minimize On Close Menu Item
                //Select 1 times to perform for un-tick 
                else {
                    console.log("userConfig.minimizeOnClose::true::" + userConfig.minimizeOnClose);
                    await wActions.selectMinimizeOnClose();
                    await wActions.closeWindowByClick();
                    await wActions.verifyMinimizeWindows();
                }
                done();
            }
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in readConfig with error: ${err}`));
        })
    });

});
