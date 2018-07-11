const Application = require('./spectronSetup');
const Actions = require('./spectronActions');
const constants = require('./spectronConstants.js');

let app = new Application({});
let actions;

describe('Tests for Opening Shortcut Modal', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            app = await app.startApplication()
            actions = await new Actions(app)
            done()
        } catch(err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    // afterAll((done) => {
    //     if (app && app.isRunning()) {
    //         jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    //         app.stop().then(() => {
    //             done();
    //         }).catch((err) => {
    //             done();
    //         });
    //     }
    // });

    /**
     * Verify Shortcuts modal displays correctly on Windows
     * TC-ID: 3348518
     * Cover scenarios in AVT-770
     */
    it('Verify Shortcuts modal displays correctly on Windows', async (done) => {
        try {
            await actions.login(constants.ADMIN_USERNAME, constants.ADMIN_PASSWORD);
            await actions.openShortcutModal();
            done();
        } catch(err) {
            done.fail(new Error(`alwaysOnTop failed in waitUntilWindowLoaded with error: ${err}`));
        };
    });
});