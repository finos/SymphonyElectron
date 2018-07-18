const Application = require('./spectronSetup');
const WindowsActions = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');

let app;
let windowActions;
let webActions;

describe('Tests for always on top', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication();
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            done();
        } catch(err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    afterAll(async (done) => {
        try {
            await windowActions.killProcess("notepad.exe");
            if (app && app.isRunning()) {
                jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
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
            await webActions.minimizeWindows();
            await windowActions.openAppInMaximize("C:\\Windows\\notepad.exe");
            await windowActions.showWindow();
            await windowActions.clickOutsideWindow();
            await windowActions.verifyWindowsOnTop();

            //Close and open app again, make sure it's always on top
            await app.stop();
            app = await new Application({}).startApplication();
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            await windowActions.clickOutsideWindow();
            await windowActions.verifyWindowsOnTop();
            done();
        } catch(err) {
            done.fail(new Error(`Fail to keep Always on Top options when multiple applications are opened with error: ${err}`));
        };
    });
});