const Application = require('./spectronSetup');
const WindowsActions = require('./spectronWindowsActions');
const { isMac } = require('../../js/utils/misc.js');
const Utils = require('./spectronUtils');

let app;
let windowActions;

!isMac ? describe('Tests for Electron Production Logging', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication();
            windowActions = await new WindowsActions(app);
            await windowActions.deleteAllLogFiles();
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
                done();
            }
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });

    /**
     * Verify the production logs exists when clicking on "Show logs in Explorer"
     * TC-ID: 3935260
     * Cover scenarios in AVT-1029
     */
    it('Verify the production logs exists when clicking on Show logs in Explorer', async (done) => {
        try {
            await windowActions.openMenu(["Help", "Troubleshooting", "Show Logs in Explorer"]);
            Utils.sleep(2000) //sleep for creating log
            await windowActions.verifyLogExported();
            done();
        } catch (err) {
            done.fail(new Error(`Fail to export production logs with error: ${err}`));
        };
    });
}) : describe.skip();
