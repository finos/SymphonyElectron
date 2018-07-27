const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
const robot = require('robotjs');
var app = new Application({
  startTimeout: Application.getTimeOut(),
  waitTimeout: Application.getTimeOut()
});
var webdriver = new WebDriver({ browser: 'chrome' });
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const ifc = require('./spectronInterfaces.js');
const specconst = require('./spectronConstants.js');
let webActions, windowAction;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 20
 /**
     * Verify toast notification when Persist Notification is ON
     * TC-ID: 3308790
    * Cover scenarios in AVT-1025
    */
!isMac? describe('Verify toast notification when Persist Notification is ON', () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();
  let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  beforeAll((done) => {
    return app.startApplication().then(async (startedApp) => {
      app.app = await startedApp;
      windowAction = await new WindowsAction(app.app);
      webActions = await new WebActions(app.app);
      done();
    }).catch((err) => {
      done.fail(new Error(`Unable to start application error: ${err}`));
    });
  }); 
  afterAll((done) => {
    if (app.app && app.app.isRunning()) {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
      app.app.stop().then(() => {
        done();
      }).catch((err) => {
        done();
      });
    }
  });
  it('Toast notification appears on screen and should stay on the screen IM', async () => {

    await webdriver.startDriver();
    await webdriver.login();
    await webdriver.createIM(specconst.USER_B);  
    await webdriver.sendMessages(["0000000000000"]); 
    await webActions.login(specconst.USER_B).then(async () => { 
      await app.app.browserWindow.getBounds().then(async (bounds) => {
        await robot.setMouseDelay(100);
        let x = bounds.x + 95;
        let y = bounds.y + 200;
        await robot.moveMouseSmooth(x, y);
        await robot.moveMouse(x, y);
        await robot.mouseClick('right');
        await robot.setKeyboardDelay(1000);
        await robot.keyTap('right');           
        await robot.keyTap('enter');           
      }).catch((err) => {
        console.log("Message:"+err);
      });
    }).catch((err1) => {
      console.log("Message:"+err1);
    });

    await app.app.client.waitForExist(ifc.SETTTING_BUTTON, windowAction.timeOut(30)).then(async () => {
      await webActions.clickElement(ifc.SETTTING_BUTTON, ifc.ALERT_OPTION, windowAction.timeOut(5));
      await webActions.clickElement(ifc.ALERT_OPTION, ifc.ALERT_TAB, windowAction.timeOut(10));
      await webActions.clickElement(ifc.PERSIS_NOTIFICATION_INPUT_IM, ifc.PERSIS_NOTIFICATION_INPUT_IM, windowAction.timeOut(5));
      await webActions.scrollAndClick(ifc.SCROLL_TAB_ACTIVE, ifc.PERSIS_NOTIFICATION_INPUT_SIGNAL);

    }).catch((err1) => {
      console.log("Message:"+err1);
    });
    await windowAction.pressCtrlM();  
    await webdriver.sendMessages(["1111111111111","1111111111111","1111111111111"]);    
    
    await app.app.client.windowByIndex(1).then(async () => {
      await app.app.browserWindow.getTitle().then(async (title) => {
        await expect(title === 'Electron').toBeTruthy();
      }).catch((err1) => {
        console.log("Message:"+err1);
      });
    
    }).catch((err1) => {
      console.log("Message:"+err1);
    });
  });

  it('Toast notification appears on screen and should stay on the screen MIM', async () => {
    await webdriver.startDriver();
    await webdriver.createMIM([specconst.USER_B, specconst.USER_C]);
    await webdriver.sendMessages(["2222222222222222","2222222222222222","2222222222222222"]);
    await windowAction.focusWindow();  
    await app.app.client.windowByIndex(1).then(async () => {
      await app.app.browserWindow.getTitle().then(async (title) => {
        await expect(title === 'Electron').toBeTruthy();
        await windowAction.clickNotification();
      }).catch((err1) => {
        console.log("Message:"+err1);
      });
     
    }).catch((err) => {   
      console.log("Message:"+err);   
    });
  });
}):describe.skip();

