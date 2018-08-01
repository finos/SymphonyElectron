const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const WindowsAction = require('./spectronWindowsActions');
const WebAction = require('./spectronWebActions');
var app  =  new Application({
            startTimeout: Application.getTimeOut(),
            waitTimeout: Application.getTimeOut()
        });
let wActions;
let webActions;

!isMac ?describe('Add Test To Verify Minimize on Close', () => {
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
    * Verify Minimize on Close option once the application is installed
    * TC-ID: 3084609
   * Cover scenarios in AVT-939
   */
    it('Verify Minimize on Close option once the application is installed',  async(done) => {
        await Application.readConfig(app.pathApp).then(async (userConfig) => {
            
                //When app  un-ticked on Minimize On Close Menu Item
                //Select 1 times to perform for ticking Menu 
                await wActions.openMenu(["Window","Minimize on Close"]);
                              
                if (userConfig.minimizeOnClose != false) {  
                    //When app ticked on Minimize On Close Menu Item
                    //Select 2 times to perform for ticking Menu                  
                    await wActions.openMenu(["Window","Minimize on Close"]);                              
                                      
                }                
                await wActions.openMenu(["Window","Close"]);               
                await wActions.verifyMinimizeWindows(); 
                done();
           
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in readConfig with error: ${err}`));
        })
    });

     /**
        * Close window when 'Minimize on Close' is ON
        * TC-ID: 2911252
    * Cover scenarios in AVT-937
    */
    it('Close window when "Minimize on Close" is ON', async (done) => {
   
        Application.readConfig(app.pathApp).then(async (userConfig) => {
           
                //When app  un-ticked on Minimize On Close Menu Item
                //Select 1 times to perform for ticking Menu 
                await wActions.focusWindow();
                await wActions.openMenu(["Window","Minimize on Close"]); 
                if (userConfig.minimizeOnClose != false) {                    
                    await wActions.openMenu(["Window","Minimize on Close"]);             
                }
                //When app ticked on Minimize On Close Menu Item
                //Select 2 times to perform for ticking Menu                              
                    
                await wActions.openMenu(["Window","Close"])
                await wActions.verifyMinimizeWindows();

                await wActions.focusWindow();
                await wActions.pressCtrlW();
                await wActions.verifyMinimizeWindows();

                await wActions.focusWindow();  
                await wActions.openMenu(["Window","Close"])
                await wActions.verifyMinimizeWindows();            
                done();
           
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in readConfig with error: ${err}`));
        })
    });
     /**
     * Verify by deselecting Minimize on Close option once the application is launched
     * TC-ID: 3084612
    * Cover scenarios in AVT-938
    */
    it('Verify by deselecting Minimize on Close option once the application is launched', async (done) => {
        await Application.readConfig(app.pathApp).then(async (userConfig) => {
           
                await wActions.focusWindow();
                await wActions.openMenu(["Window","Minimize on Close"]).then(async ()=>
                {
                    if (userConfig.minimizeOnClose == false) {
                        //When app does not tick on Minimize On Close Menu Item
                        //Select 2 times to perform for un-ticking Menu
                        await wActions.openMenu(["Window","Minimize on Close"]);                      
                                            
                    }
                    await wActions.openMenu(["Window","Close"])
                    await wActions.verifyMinimizeWindows();   
                    done();
                });              
            
            
        }).catch((err) => {
            done.fail(new Error(`minimize-on-close failed in readConfig with error: ${err}`));
        })
    });
}) : describe.skip();
