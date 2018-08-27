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
const Utils = require('./spectronUtils');
const ifc = require('./spectronInterfaces.js');
let webActions, windowAction;

!isMac ? describe('Verify toast notification for IMs', () => {
  let originalTimeout = specconst.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = specconst.TIMEOUT_TEST_SUITE;

  beforeAll(async (done) => {
    try {
      app = await new Application({}).startApplication({ testedHost: specconst.TESTED_HOST, alwaysOnTop: true });
      windowAction = await new WindowsAction(app);
      webActions = await new WebActions(app);
      done();
    } catch (err) {
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
    await webdriver.createIM(specconst.USER_B.username);
    await webActions.login(specconst.USER_B);
    await windowAction.reload();
    await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(50));
    await webActions.clickIfElementVisible(ifc.SETTTING_BUTTON);
    await windowAction.pressCtrlM();
    await webdriver.clickLeftNavItem(specconst.USER_B.name);
    var message = await Utils.randomString();
    await webdriver.sendMessages([message]);
    await windowAction.verifyNotCloseToastWhenMouseOver(message);

  });
  /**
  * Verify toast notification for signals, mentions and keywords
  * TC-ID: 3395306
 * Cover scenarios in AVT-1032
 */
  it('Verify toast notification for signals, mentions and keywords', async () => {
    var nameSignal = await Utils.randomString();
    var nameHashTag = await Utils.randomString();
    var roomName = await Utils.randomString();
    var description = await Utils.randomString();

    await webdriver.createSignal(nameSignal, nameHashTag);
    await webdriver.createRoom([specconst.USER_B.username], roomName, description, specconst.TYPE_ROOM.public)
    await webdriver.clickLeftNavItem(roomName);

    await webdriver.sendMessages(["#" + nameHashTag]);
    await windowAction.verifyNotCloseToastWhenMouseOver(specconst.USER_A.name + ": #" + nameHashTag);
    await webdriver.mentionUserOnChat(specconst.USER_B);
    await windowAction.verifyNotCloseToastWhenMouseOver(specconst.USER_A.name + ": @" + specconst.USER_B.name);
  });

}) : describe.skip();
