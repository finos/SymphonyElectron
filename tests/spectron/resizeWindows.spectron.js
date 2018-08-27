const Application = require('./spectronSetup');
const {isMac} = require('../../js/utils/misc');
const WindowsActions = require('./spectronWindowsActions');

let app = new Application({});
let windowActions;

describe('Tests for Resizing windows', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication();
            windowActions = await new WindowsActions(app);
            done();
        } catch(err) {
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
     * Verify whether the main window can be minimized upto 300px
     * TC-ID: 3028239
     * Cover scenarios in AVT-768
     */
    it('Should be minimized up to 300px', async (done) => {
        try {
            await windowActions.resizeWindows(0, 0);
            expect([ 300, 300 ]).toEqual(await windowActions.getCurrentSize());
            done();
        } catch (err) {
            done.fail(new Error(`failed to minimize window to 300 px with error: ${err}`));
        }
    });
});
