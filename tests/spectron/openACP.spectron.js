const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
const Utils = require('./spectronUtils');
var app = new Application({
  startTimeout: 1200000,
  waitTimeout: 1200000
});
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const ifc = require('./spectronInterfaces.js');
const specconst = require('./spectronConstants.js');
let webActions, windowAction;

!isMac ? describe(' Open ACP inside Electron when clicking on the "Go to AC portal"', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1200000;   
    beforeAll(async(done) => {
        try
        {
            app = await new Application({}).startApplication({testedHost:specconst.TESTED_HOST, alwaysOnTop: true});
            windowAction = await new WindowsAction(app);
            webActions = await new WebActions(app);
            done();
        } catch(err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });
    afterAll(async (done) => {
        try {
            if (app && app.isRunning()) {              
                await app.stop();    
                done();
            }
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });
  /**
    * The user is directed to the ACP inside Electron and does not login again
    * TC-ID: 3308790
   * Cover scenarios in AVT-1107
   */
    it('The user is directed to the ACP inside Electron and does not login again', async () => {
          
        await webActions.login(specconst.USER_A);
        await windowAction.reload();      
        await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(50));
        await windowAction.pressF11();  
        await webActions.openACP();            
        await webActions.verifyElementExist(ifc.IMG_ADMIN_LOGO);  

    });

    /**
    * The user is directed to the ACP inside Electron and does not login again
    * TC-ID: 3308790
   * Cover scenarios in AVT-1107
   */
    it('Verify user is kicked out all of chat client + ACP after 10 mins of inactivity in the ACP', async () => {
               
        await webActions.logout();
        await webActions.logintoAdmin(specconst.USER_A);             
        await webActions.verifyElementExist(ifc.IMG_ADMIN_LOGO);       
        await webActions.sleepAndWaitForLoginForm();       
    })    
 
}) : describe.skip();
