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
    jasmine.DEFAULT_TIMEOUT_INTERVAL = constants.TIMEOUT_TEST_SUITE;

    beforeAll(async (done) => {
        try {
            webDriver = await new WebDriver({ browser: 'chrome' });
            app = await new Application({}).startApplication({ testedHost: constants.TESTED_HOST, alwaysOnTop: true });
            let screen = await app.electron.screen.getPrimaryDisplay();
            webActions = await new WebActions(app);
            windowsActions = await new WindowsActions(app);
            await webDriver.startDriver();
            await webActions.login(constants.USER_A);
            await windowsActions.bringToFront("Symphony");
            await windowsActions.reload(); //workaround to show topbar menu
            await webDriver.login(constants.USER_B);
            done();
        } catch (err) {
            await windowsActions.stopApp();
            await webDriver.quit();
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    afterAll(async (done) => {
        try {
            await windowsActions.stopApp();
            await webDriver.quit();
            done();
        } catch (err) {
            await windowsActions.stopApp();
            await webDriver.quit();
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
            if (await windowsActions.isAppRunning()) {
                let message1 = await Utils.randomString();
                let message2 = await Utils.randomString();

                //"Mute pop-up alerts on my desktop"=OFF
                await webActions.openAlertsSettings();
                await webActions.checkBox(ui.MUTE_POPUP_ALERTS_CKB, false);
                await webDriver.createIM(constants.USER_A.name);
                await webDriver.sendMessages([message1]);
                await webActions.verifyToastNotificationShow(message1);
                await Utils.sleep(5); //waitting for toast message disappears

                //"Mute pop-up alerts on my desktop"=ON
                await webActions.checkBox(ui.MUTE_POPUP_ALERTS_CKB, true);
                await webDriver.sendMessages([message2]);
                await webActions.verifyNoToastNotificationShow(message2);
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify pop-up alert play depends on setting: ${err}`));
        };
    });

    /**
     * Verify Configure alert position at top/bottom left/right
     * TC-ID: 2916213, 2916214, 2916215, 2916216
     * Cover scenarios in AVT-1026
     */
    it('Configure alert position at top/bottom left/right ', async (done) => {
        try {
            if (await windowsActions.isAppRunning()) {
                let lowerRightMessage = await Utils.randomString();
                let upperRightMessage = await Utils.randomString();
                let upperLeftMessage = await Utils.randomString();
                let lowerLeftMessage = await Utils.randomString();

                await webDriver.createIM(constants.USER_A.name);
                await webActions.openAlertsSettings();
                await webActions.checkBox(ui.MUTE_POPUP_ALERTS_CKB, false);
                await webActions.adjustNotificationPosition("lower-right");
                await webDriver.sendMessages([lowerRightMessage]);
                await windowsActions.verifyToastNotificationPosition(lowerRightMessage, "lower-right");

                await webActions.adjustNotificationPosition("upper-right");
                await webDriver.sendMessages([upperRightMessage]);
                await windowsActions.verifyToastNotificationPosition(upperRightMessage, "upper-right");

                await webActions.adjustNotificationPosition("upper-left");
                await webDriver.sendMessages([upperLeftMessage]);
                await windowsActions.verifyToastNotificationPosition(upperLeftMessage, "upper-left");

                await webActions.adjustNotificationPosition("lower-left");
                await webDriver.sendMessages([lowerLeftMessage]);
                await windowsActions.verifyToastNotificationPosition(lowerLeftMessage, "lower-left");
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to configure alert position at top/bottom left/right : ${err}`));
        };
    });
}) : describe.skip();
