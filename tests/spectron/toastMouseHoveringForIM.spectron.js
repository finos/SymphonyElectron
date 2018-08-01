const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
var app = new Application({
  startTimeout: Application.getTimeOut(),
  waitTimeout: Application.getTimeOut()
});
var webdriver = new WebDriver({ browser: 'chrome' });
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const specconst = require('./spectronConstants.js');
const ifc = require('./spectronInterfaces.js');
let webActions, windowAction;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 20

!isMac? describe('Verify toast notification for IMs', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    beforeAll(async(done) => {
        try
        {
            app = await new Application({}).startApplication();
            windowAction = await new WindowsAction(app);
            webActions = await new WebActions(app);
            done();
        } catch(err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });
    afterAll((done) => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.stop().then(() => {
              webdriver.close();
              webdriver.quit();
              done();
            }).catch((err) => {
              done();
            });
        }
    });
   /**
     * Verify toast notification for IMs
     * TC-ID: 3395297
    * Cover scenarios in AVT-1031
    */
    it('Toast notification should not be closed', async () => {

        await webdriver.startDriver();
        await webdriver.login(specconst.USER_A);
        await webdriver.createIM(specconst.USER_B).then(async()=>
        {;  
          await webdriver.sendMessages([webdriver.randomString()]); 
        });        
        await webActions.login(specconst.USER_B);
        await windowAction.reload();    
        await app.client.waitForVisible(ifc.SETTTING_BUTTON, windowAction.timeOut(50));
        await windowAction.pressCtrlM();    
        await webdriver.clickLeftNavItem(specconst.USER_B.name);
        await webdriver.sendMessages([webdriver.randomString(),webdriver.randomString(),webdriver.randomString()]); 
        await windowAction.verifyNotCloseToastWhenMouseOver();  
         
    });
     /**
     * Verify toast notification for signals, mentions and keywords
     * TC-ID: 3395306
    * Cover scenarios in AVT-1032
    */
  it('Verify toast notification for signals, mentions and keywords', async () => {    
    var nameSignal = await webdriver.randomString();
    var nameHashTag = await webdriver.randomString();
    var roomName = await webdriver.randomString();
    var description =await  webdriver.randomString();
    
    await webdriver.createSignal(nameSignal,nameHashTag);
    await webdriver.createRoom([specconst.USER_B],roomName,description,specconst.TYPE_ROOM.public)
    await webdriver.clickLeftNavItem(roomName);

    await webdriver.sendMessages(["#"+nameHashTag]);
    await windowAction.verifyNotCloseToastWhenMouseOver();
    await webdriver.mentionUserOnChat(specconst.USER_B);
    await windowAction.verifyNotCloseToastWhenMouseOver();    
  });
  
}):describe.skip();
