const Application = require('./spectronSetup');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
const Utils = require('./spectronUtils');
let app = new Application({
    startTimeout: Application.getTimeOut(),
    waitTimeout: Application.getTimeOut()
});
let webdriver = new WebDriver({ browser: 'chrome' });
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const specconst = require('./spectronConstants.js');

let webActions, windowAction;

!isMac ? describe('Test for Badge Count on MAC', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();
    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
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
       * Show 1 in tray icon when unread message = 1
       * TC-ID: 2906586
       * Cover scenarios in AVT-1095
       */
    it('Show 1 in tray icon when unread message = 1', async (done) => {
        try {
            let message = await Utils.randomString();
            await webdriver.startDriver();
            await webdriver.login(specconst.USER_A);
            await webdriver.createIM(specconst.USER_B.username);
            await webActions.login(specconst.USER_B);
            await webActions.clickLeftNavItem(specconst.USER_A.name);
            await webActions.openAlertsSettings();
            let currentBadgeCount = await windowAction.getBadgeCount();
            await webdriver.sendMessage(message);
            await windowAction.verifyCurrentBadgeCount(currentBadgeCount + 1);
            done();
        } catch (err) {
            done.fail(new Error(`Show 1 in tray icon with error: ${err}`));
        }
    });

}) : describe.skip();
