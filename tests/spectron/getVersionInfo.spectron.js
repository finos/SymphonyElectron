const Application = require('./spectronSetup');
const WebActions = require('./spectronWebActions');
const WindowsActions = require('./spectronWindowsActions');
const constants = require('./spectronConstants.js');
const path = require('path');
const ui = require('./spectronInterfaces.js');
let TIMEOUT_TEST_SUITE = parseInt(constants.TIMEOUT_TEST_SUITE, 10);
let app, windowsActions;

describe('Tests for getVersionInfo API', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = TIMEOUT_TEST_SUITE;

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

    it('Should verify if the version numbers are correct', async (done) => {
        try {
            if (await windowsActions.isAppRunning()) {
                await webActions.navigateURL('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'));
                await windowsActions.bringToFront("Symphony");
                await webActions.clickIfElementVisible(ui.GET_VERSION_BUTTON);
                await webActions.verifyVersionInfo();
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify the version numbers: ${err}`));
        };
    });
});