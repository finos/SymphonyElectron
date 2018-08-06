const Application = require('./spectronSetup');
const WebActions = require('./spectronWebActions');
const WindowsActions = require('./spectronWindowsActions');
const WebDriver = require('./spectronWebDriver');
const { isMac } = require('../../js/utils/misc.js');
const constants = require('./spectronConstants.js');
const ui = require('./spectronInterfaces.js');
const Utils = require('./spectronUtils');

let app, webDriver, webActions, windowsActions;

!isMac ? describe('Tests for Toast Notification ', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = constants.TIMEOUT_PAGE_LOAD;

    beforeAll(async (done) => {
        try {
            webDriver = await new WebDriver({ browser: 'chrome' });
            app = await new Application({}).startApplication({testedHost: process.env.TESTED_HOST, alwaysOnTop: true});
            webActions = await new WebActions(app);
            windowsActions = await new WindowsActions(app);
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
                await webDriver.quit();
                done();
            }
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });

    /**
     * Verify Pop-up alert play depends on setting
     * TC-ID: 2916217
     * Cover scenarios in AVT-1024
     */
    it('Pop-up alert play depends on setting', async (done) => {
        try {
            let message1 = await Utils.randomString();
            let message2 = await Utils.randomString();

            //"Mute pop-up alerts on my desktop"=OFF
            await webDriver.startDriver();
            await webActions.login(process.env.USER_A);
            await webDriver.login(process.env.USER_B);
            await windowsActions.reload();
            await webActions.openAlertsSettings();
            await webActions.checkBox(ui.MUTE_POPUP_ALERTS_CKB, false);
            await webDriver.createIM(process.env.USER_A);
            await webDriver.sendMessages([message1]);
            await webActions.verifyToastNotificationShow(message1);
            await Utils.sleep(5); //waitting for toast message disappears

            //"Mute pop-up alerts on my desktop"=ON
            await webActions.checkBox(ui.MUTE_POPUP_ALERTS_CKB, true);
            await webDriver.sendMessages([message2]);
            await webActions.verifyNoToastNotificationShow(message2);
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify pop-up alert play depends on setting: ${err}`));
        };
    });
}) : describe.skip();
