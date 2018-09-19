const Application = require('./spectronSetup');
const WindowsActions = require('./spectronWindowsActions');
const constants = require('./spectronConstants.js');
const {isMac} = require('../../js/utils/misc');
let TIMEOUT_TEST_SUITE = parseInt(constants.TIMEOUT_TEST_SUITE, 10);
let app, windowsActions;

describe('Tests for fullscreen', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = TIMEOUT_TEST_SUITE;

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication({ testedHost: constants.TESTED_HOST, alwaysOnTop: true });
            windowsActions = await new WindowsActions(app);
            done();
        } catch (err) {
            await windowsActions.stopApp();
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    afterAll(async (done) => {
        try {
            await windowsActions.stopApp();
            done();
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });

    it('Should set the app full screen and check whether it is in full screen', async (done) => {
        try {
            if (await windowsActions.isAppRunning()) {
                if (isMac) {
                    await windowsActions.fullScreenOnMac();
                } else {
                    await windowsActions.openMenu(["View", "Toggle Full Screen"]);
                }
                await windowsActions.verifyAppFullScreen();
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify app full screen: ${err}`));
        };
    });
});