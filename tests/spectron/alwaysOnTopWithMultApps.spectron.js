const Application = require('./spectronSetup');
const WindowsActions = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const Utils = require('./spectronUtils');
const { isMac } = require('../../js/utils/misc');

let app;
let windowActions;
let webActions;

describe('Tests for always on top with mult-apps are opened', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication({ alwaysOnTop: false });
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            done();
        } catch (err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    afterAll(async (done) => {
        try {
            if (isMac) {
                await Utils.killProcess("Notes");
                await Utils.killProcess("Reminders");
            } else {
                await Utils.killProcess("notepad.exe");
                await Utils.killProcess("mspaint.exe");
            }
            if (app && app.isRunning()) {
                await app.stop();
                done();
            }
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });

    /**
     * Verify Always on Top options when multiple applications are opened
     * TC-ID: 2898431
     * Cover scenarios in AVT-990
     */
    it('Verify Always on Top options when multiple applications are opened', async (done) => {
        try {
            await windowActions.setAlwaysOnTop(true);
            await webActions.minimizeWindows();
            if (isMac) {
                await Utils.openAppInMaximize("Notes");
                await Utils.openAppInMaximize("Reminders");
                await Utils.sleep(10); //Sleep 10secs for waiting app opening completely.
            } else {
                await Utils.openAppInMaximize("notepad.exe");
                await Utils.openAppInMaximize("mspaint.exe");
            }
            await windowActions.showWindow();
            await windowActions.clickOutsideWindow();
            await windowActions.verifyWindowsOnTop(true);
            
            //Close and open app again, make sure it's always on top
            await app.stop();
            app = await new Application({}).startApplication();
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            await windowActions.clickOutsideWindow();
            await windowActions.verifyWindowsOnTop(true);
            done();
        } catch (err) {
            done.fail(new Error(`Fail to keep Always on Top options when multiple applications are opened with error: ${err}`));
        };
    });
});
