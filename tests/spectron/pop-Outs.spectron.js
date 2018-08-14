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
            app = await new Application({}).startApplication({ testedHost: constants.TESTED_HOST });
            webActions = await new WebActions(app);
            windowsActions = await new WindowsActions(app);
            await webActions.login(constants.USER_A);
            done();
        } catch (err) {
            await windowsActions.stopApp();
            done.fail(new Error(`Failed at beforeAll: ${err}`));
        };
    });

    beforeEach(async (done) => {
        try {
            await windowsActions.bringToFront("Symphony");
            await windowsActions.closeAllPopOutWindow();
            await webActions.closeAllGridModules();
            done();
        } catch (err) {
            await windowsActions.stopApp();
            done.fail(new Error(`Failed at beforeEach: ${err}`));
        };
    });

    afterAll(async (done) => {
        try {
            await windowsActions.closeAllPopOutWindow();
            await webActions.closeAllGridModules();
            await windowsActions.stopApp();
            done();
        } catch (err) {
            await windowsActions.stopApp();
            await done.fail(new Error(`Failed at afterAll: ${err}`));
        };
    });

    /**
     * Verify pop-out chat, inbox
     * TC-ID: 2897209
     * Cover scenarios in AVT-1081
     */
    it('Verify pop-out chat, inbox', async (done) => {
        try {
            if (await windowsActions.isAppRunning()) {
                if (isMac) {
                    done();
                } else {
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
                    done();
                }
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify pop-out chat, inbox: ${err}`));
        };
    });

    /**
     * Verify pop-in popped-out chat
     * TC-ID: 4130268
     * Cover scenarios in AVT-1082
     */
    it('Verify pop-in popped-out chat', async (done) => {
        try {
            if (await windowsActions.isAppRunning()) {
                if (isMac) {
                    done();
                } else {
                    await webActions.createIM(constants.USER_B.name);
                    await webActions.pinChat();
                    await webActions.clickPopOutIcon();
                    await webActions.clickPopInIcon(constants.USER_B.name);
                    await webActions.verifyPopOutIconDisplay();

                    //Verify pinned module is persisted on grid
                    await webActions.createIM(constants.USER_C.name);
                    await webActions.verifyChatModuleVisible(constants.USER_B.name);
                    done();
                }
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify Pop-in popped-out chat: ${err}`));
        };
    });
})