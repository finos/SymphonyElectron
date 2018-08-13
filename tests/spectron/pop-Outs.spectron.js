const Application = require('./spectronSetup');
const WebActions = require('./spectronWebActions');
const WindowsActions = require('./spectronWindowsActions');
const { isMac } = require('../../js/utils/misc.js');
const constants = require('./spectronConstants.js');
const Utils = require('./spectronUtils');

let app, webActions, windowsActions;

describe('Tests for Pop-Outs', () => {
    
    jasmine.DEFAULT_TIMEOUT_INTERVAL = constants.TIMEOUT_TEST_SUITE;

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication({testedHost: constants.TESTED_HOST});
            webActions = await new WebActions(app);
            windowsActions = await new WindowsActions(app);
            done();
        } catch (err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    afterAll(async (done) => {
        try {
            await windowsActions.closeAllPopOutWindow();
            if (app && app.isRunning()) {
                await app.stop();
                await webDriver.quit();
                done();
            }
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });

    /**
     * Verify pop-out chat, inbox
     * TC-ID: 2897209
     * Cover scenarios in AVT-1081
     */
    it('Verify pop-out chat, inbox', async (done) => {
        try {
            if (isMac) {
                done();
            } else {
                await webActions.login(constants.USER_A);
                await windowsActions.closeAllPopOutWindow();
                await windowsActions.bringToFront("Symphony");

                await webActions.createIM(constants.USER_B.name);
                await webActions.clickPopOutIcon();
                await windowsActions.verifyPopOutWindowAppear(constants.USER_B.name);
                await webActions.verifyPopInIconDisplay(constants.USER_B.name);

                await webActions.clickInboxIcon();
                await webActions.clickInboxPopOutIcon();
                await windowsActions.verifyPopOutWindowAppear("Inbox");
                await webActions.verifyPopInIconDisplay("Inbox");

                await windowsActions.bringToFront("Symphony");
                await webActions.clickInboxIcon();
                await windowsActions.verifyWindowFocus("Inbox");

                await windowsActions.bringToFront("Symphony");
                await webActions.clickLeftNavItem(constants.USER_B.name);
                await Utils.sleep(1); //wait for popout overlaying completely
                await windowsActions.verifyWindowFocus(constants.USER_B.name);

                await windowsActions.bringToFront("Symphony");
                await webActions.logout();
                await webActions.login(constants.USER_A);
                await windowsActions.verifyPopOutWindowAppear(constants.USER_B.name);
                await windowsActions.verifyPopOutWindowAppear("Inbox");

                await windowsActions.closeAllPopOutWindow();
                done();
            }
        } catch (err) {
            done.fail(new Error(`Fail to verify pop-out chat, inbox: ${err}`));
        };
    });
})