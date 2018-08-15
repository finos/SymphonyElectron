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

!isMac ? describe('Verify Flash notification in taskbar option when multiple applications are opened', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication({ testedHost: specconst.TESTED_HOST, alwaysOnTop: true });
            windowAction = await new WindowsAction(app);
            webActions = await new WebActions(app);
            webdriver.webAction = webActions;
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
      * Verify Flash notification in taskbar option when multiple applications are opened
      * TC-ID: 47308146
     * Cover scenarios in AVT-1083
     */
    it('Verify Flash notification in taskbar option when multiple applications are opened', async () => {

        await webdriver.startDriver();
        await webdriver.login(specconst.USER_A);
        await webdriver.createIM(specconst.USER_B.username);
        await webActions.login(specconst.USER_B);
        await windowAction.reload();
        await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(50));
        await webActions.clickIfElementVisible(ifc.SETTTING_BUTTON);
        await windowAction.pressCtrlM();
        await webdriver.clickLeftNavItem(specconst.USER_B.name);
        let messages = [];
        await messages.push(await Utils.randomString());
        await messages.push(await Utils.randomString());
        await messages.push(await Utils.randomString());
        await webdriver.sendMessagesAndVerifyToast(messages);

    });

}) : describe.skip();

