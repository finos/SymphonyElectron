const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
var app = new Application({});
let webdriver, webActions, windowAction, message;
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const specconst = require('./spectronConstants.js');
const Utils = require('./spectronUtils');
const ifc = require('./spectronInterfaces.js');

!isMac ? describe('Verify toast notification for IMs', () => {
  let originalTimeout = specconst.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = specconst.TIMEOUT_TEST_SUITE;

  beforeAll(async (done) => {
    try {
      webdriver = await new WebDriver({ browser: 'chrome' });
      app = await new Application({}).startApplication({ testedHost: specconst.TESTED_HOST, alwaysOnTop: true });
      windowAction = await new WindowsAction(app);
      webActions = await new WebActions(app);      
      await webdriver.startDriver();
      done();
    } catch (err) {
      done.fail(new Error(`Unable to start application error: ${err}`));
    };
  });
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
    * Verify toast notification for IMs
    * TC-ID: 3395297
   * Cover scenarios in AVT-1031
   */
  it('Toast notification should not be closed', async (done) => {
    try {
      await webdriver.startDriver();
      await webdriver.login(specconst.USER_A);
      await webdriver.closeAllGridModules();
      await webdriver.createIM(specconst.USER_B.username);
      await webActions.login(specconst.USER_B);
      await windowAction.reload();
      await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(30));
      await webActions.persistToastIM(false);
      await windowAction.pressCtrlM();
      await webdriver.clickLeftNavItem(specconst.USER_B.name);
      message = await Utils.randomString();
      await webdriver.sendMessages([message]);
      await windowAction.verifyNotCloseToastWhenMouseOver(message);
      await done();
    }
    catch (err) {
      done.fail(new Error(`Failed at toast notification should not be closed: ${err}`));
    };

  });
  /**
  * Verify toast notification for signals, mentions and keywords
  * TC-ID: 3395306
 * Cover scenarios in AVT-1032
 */
  it('Verify toast notification for signals, mentions and keywords', async (done) => {
    try {
      let nameSignal = await Utils.randomString();
      let nameHashTag = await Utils.randomString();
      let roomName = await Utils.randomString();
      let description = await Utils.randomString();

      await webdriver.createSignal(nameSignal, nameHashTag);
      await webdriver.createRoom([specconst.USER_B.username], roomName, description, specconst.TYPE_ROOM.public)
      await webdriver.clickLeftNavItem(roomName);

      await webdriver.sendMessages(["#" + nameHashTag]);
      await windowAction.verifyNotCloseToastWhenMouseOver(specconst.USER_A.name + ": #" + nameHashTag);
      await webdriver.mentionUserOnChat(specconst.USER_B);
      await windowAction.verifyNotCloseToastWhenMouseOver(specconst.USER_A.name + ": @" + specconst.USER_B.name);
      await done();
    }
    catch (err) {
      done.fail(new Error(`Failed at Verify toast notification for signals, mentions and keywords: ${err}`));
    };
  });

}) : describe.skip();
