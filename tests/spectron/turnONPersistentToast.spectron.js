const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
const Utils = require('./spectronUtils');
var app = new Application({});
  

var webdriver = new WebDriver({ browser: 'chrome' });
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const ifc = require('./spectronInterfaces.js');
const specconst = require('./spectronConstants.js');
let webActions, windowAction;

!isMac ? describe('Verify toast notification when Persist Notification is ON', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;   
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
                jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                await app.stop();    
                await webdriver.quit();
                done();
            }
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });
  /**
    * Verify toast notification when Persist Notification is ON
    * TC-ID: 3308790
   * Cover scenarios in AVT-1025
   */
    it('Toast notification appears on screen and should stay on the screen IM', async () => {

        await webdriver.startDriver();
        await webdriver.login(specconst.USER_A);
        await webdriver.createIM(specconst.USER_B.username);       
        await webActions.login(specconst.USER_B);
        
        await windowAction.reload(); 
        await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(50));       
        await webActions.persistToastIM();
    
        await windowAction.pressCtrlM();
        var message = await Utils.randomString();
        await webdriver.sendMessages([message]);
        await windowAction.veriryPersistToastNotification(message);
        await webdriver.startDriver();
        await webdriver.createMIM([specconst.USER_B.username, specconst.USER_C.username]);
        await webdriver.sendMessages([message]);
        await windowAction.veriryPersistToastNotification(message);
     
    })
     /**
     * Verify toast notification when Persist Notification is OFF
     * TC-ID: 46602241
    * Cover scenarios in AVT-1027
    */
   it('Toast notification appears on screen and should disappear in few seconds IM', async () => {
    
        await windowAction.showWindow();
        await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(50));
        await webActions.persistToastIM();
        await webdriver.clickLeftNavItem(specconst.USER_B.name);
        var message = await Utils.randomString();
        await webdriver.sendMessages([message]);
        await windowAction.verifyNotPersistToastNotification("Electron");
        await webdriver.createMIM([specconst.USER_B.username, specconst.USER_C.username]);      
        await webdriver.sendMessages([message]);
        await windowAction.verifyNotPersistToastNotification("Electron");
      
  })
 
}) : describe.skip();
