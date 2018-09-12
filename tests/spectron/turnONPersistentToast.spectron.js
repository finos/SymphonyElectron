const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
const Utils = require('./spectronUtils');
var app = new Application({}); 
let webdriver,webActions, windowAction;
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const ifc = require('./spectronInterfaces.js');
const specconst = require('./spectronConstants.js');

!isMac ? describe('Verify toast notification when Persist Notification is ON', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = specconst.TIMEOUT_TEST_SUITE;
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    beforeAll(async(done) => {
        try
        { 
            webdriver = await new WebDriver({ browser: 'chrome' });          
            app = await new Application({}).startApplication({testedHost:specconst.TESTED_HOST, alwaysOnTop: true});
            windowAction = await new WindowsAction(app);
            webActions = await new WebActions(app);            
            await webdriver.startDriver();
            windowAction.webAction = await webActions;
            done();
        } catch(err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    })
    
    afterAll(async (done) => {
        try {
            if (app && app.isRunning()) {
                jasmine.DEFAULT_TIMEOUT_INTERVAL = await originalTimeout;
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

        await webdriver.login(specconst.USER_A);
        await webdriver.closeAllGridModules();  
        await webdriver.createIM(specconst.USER_B.username);       
        await webActions.login(specconst.USER_B);
        
        await windowAction.reload(); 
        await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(30));       
        await webActions.persistToastIM(true);
    
        await windowAction.pressCtrlM();
        message = await Utils.randomString();
        await webdriver.sendMessages([message]);
        await windowAction.verifyPersistToastNotification(message);   
        await windowAction.pressCtrlM();     
        await webdriver.createMIM([specconst.USER_B.username, specconst.USER_C.username]);
        await webdriver.sendMessages([message]);
        await windowAction.verifyPersistToastNotification(message);
     
    })
     /**
     * Verify toast notification when Persist Notification is OFF
     * TC-ID: 46602241
    * Cover scenarios in AVT-1027
    */
   it('Toast notification appears on screen and should disappear in few seconds IM', async () => {
        await windowAction.bringToFront("Symphony"); 
        await Utils.sleep(5);
        await webActions.persistToastIM(false);
        await windowAction.pressCtrlM();
        await webdriver.clickLeftNavItem(specconst.USER_B.name);
        message = await Utils.randomString();
        await webdriver.sendMessages([message]);        
        await windowAction.verifyNotPersistToastNotification();
        await webdriver.createMIM([specconst.USER_B.username, specconst.USER_C.username]);      
        await webdriver.sendMessages([message]);
        await windowAction.verifyNotPersistToastNotification();
      
  })
 
}) : describe.skip();
