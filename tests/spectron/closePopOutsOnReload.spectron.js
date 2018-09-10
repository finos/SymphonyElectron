const Application = require('./spectronSetup');
const WebActions = require('./spectronWebActions');
const WindowsActions = require('./spectronWindowsActions');
const constants = require('./spectronConstants.js');
const path = require('path');
const ui = require('./spectronInterfaces.js');
const Utils = require('./spectronUtils.js');
let app, windowsActions;

describe('Tests for pop outs reload scenario', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = constants.TIMEOUT_TEST_SUITE;

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication({ testedHost: constants.TESTED_HOST, alwaysOnTop: true });
            webActions = await new WebActions(app);
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

    it('Pop-up should be closed when main window is reloaded', async (done) => {
        try {
            if (await windowsActions.isAppRunning()) {
                await webActions.navigateURL('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'));
                await windowsActions.bringToFront("Symphony");
                await webActions.clickIfElementVisible(ui.OPEN_WINDOW_BUTTON);
                await windowsActions.verifyPopOutWindowAppear("Test pop-out window");
                await windowsActions.windowByIndex(1);
                await webActions.clickIfElementVisible(ui.OPEN_WINDOW_BUTTON);
                await windowsActions.verifyPopOutWindowAppear("Child pop-out window");
                await windowsActions.windowByIndex(0);
                await windowsActions.windowReload();
                await Utils.sleep(2);
                await windowsActions.verifyWindowCount(1);
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify pop-up closed when main window is reloaded: ${err}`));
        };
    });
});
