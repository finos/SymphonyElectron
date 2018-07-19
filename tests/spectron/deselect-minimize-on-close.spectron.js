const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');
const WindowsAction = require('./spectronWindowsActions');
const WebAction = require('./spectronWebActions');

let app = new Application({
    startTimeout: Application.getTimeOut(),
    waitTimeout: Application.getTimeOut()
});
let wActions;
describe('Verify by deselecting Minimize on Close', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {       
        await app.startApplication().then(async(startedApp) => {
            app.app =  await  startedApp; 
            wActions = await new WindowsAction(app.app); 
            webActions = await new WebAction(app.app);            
            }).then((async() =>{          
            await getConfigPath(app.app).then((config) => {
                    app.pathApp = config;  
                }).catch((err) => {
                    done.fail(new Error(`Unable to start application error: ${err}`));
                });      
                done();
            }));
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
     * Verify by deselecting Minimize on Close option once the application is launched
     * TC-ID: 3084612
    * Cover scenarios in AVT-938
    */
    it('Verify by deselecting Minimize on Close option once the application is launched', async (done) => {
        await Application.readConfig(app.pathApp).then(async (userConfig) => {
            if (isMac) {
                done();
            }
            else {
                
                await wActions.selectMinimizeOnClose();
                if (userConfig.minimizeOnClose == false) {
                    //When app does not tick on Minimize On Close Menu Item
                    //Select 2 times to perform for un-ticking Menu
                    await wActions.selectMinimizeOnClose(); 
                }
                await webActions.closeWindowByClick();
                await wActions.verifyMinimizeWindows();               
                done();
            }
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in readConfig with error: ${err}`));
        })
    });

});
