const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
var app = new Application({
    startTimeout: Application.getTimeOut(),
    waitTimeout: Application.getTimeOut()
});
let webdriver,webActions, windowAction;
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const specconst = require('./spectronConstants.js');
const Utils = require('./spectronUtils');
const ifc = require('./spectronInterfaces.js');
let TIMEOUT_TEST_SUITE = parseInt(specconst.TIMEOUT_TEST_SUITE, 10);

!isMac ? describe('Verify Flash notification in taskbar option when multiple applications are opened', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = TIMEOUT_TEST_SUITE;
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    beforeAll(async (done) => {
        try {
            webdriver = await new WebDriver({ browser: 'chrome' })
            app = await new Application({}).startApplication({ testedHost: specconst.TESTED_HOST, alwaysOnTop: true });
            windowAction = await new WindowsAction(app);
            webActions = await new WebActions(app);           
            webdriver.windowAction = windowAction;
            webdriver.webActions = webActions;         
            await webdriver.startDriver();
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
       
        await webdriver.login(specconst.USER_A);
        await webdriver.createIM(specconst.USER_B.username);
        await webdriver.createMIM([specconst.USER_B.username, specconst.USER_C.username]);
        await webActions.login(specconst.USER_B);
        await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(50));      
        await windowAction.pressCtrlM();
        await webdriver.clickLeftNavItem(specconst.USER_B.name);
        let messages = [];
        await messages.push(await Utils.randomString());
        await messages.push(await Utils.randomString());
        await messages.push(await Utils.randomString());
        await webdriver.sendMessagesAndVerifyToast(messages);

    });

}) : describe.skip();

