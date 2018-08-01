const Application = require('./spectronSetup');
const WindowsActions = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const { isMac } = require('../../js/utils/misc');
const Utils = require('./spectronUtils');

let app;
let windowActions;
let webActions;

!isMac ? describe('Tests for saved layout', () => {

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
     * Keep size and position of the windows in previous session
     * TC-ID: 2915948
     * Cover scenarios in AVT-914
     */
    it('Keep size and position of the windows in previous session', async (done) => {
        try {
            var defaultPosition = await windowActions.getCurrentPosition();
            var defaultSize = await windowActions.getCurrentSize();

            // Size and position of previos session keep after resizing and dragging
            await windowActions.setPosition(defaultPosition[0], 20);
            await windowActions.setSize(defaultSize[0] - 100, defaultSize[0] - 100);
            await Utils.sleep(1000); // Sleep 1s after resizing 
            var previousPosition = await windowActions.getCurrentPosition();
            var previousSize = await windowActions.getCurrentSize();
            await app.stop();
            app = await new Application({}).startApplication({defaultSize: false, defaultPosition: false});
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            expect(previousPosition).toEqual(await windowActions.getCurrentPosition());
            expect(previousSize).toEqual(await windowActions.getCurrentSize());

            // Size and position of previous session keep after maximizing
            await webActions.maximizeWindows();
            await Utils.sleep(1000); // Sleep 1s after resizing 
            previousSize = await windowActions.getCurrentSize();
            await app.stop();
            app = await new Application({}).startApplication({defaultSize: false, defaultPosition: false});
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            expect(previousSize).toEqual(await windowActions.getCurrentSize());
            done();
        } catch(err) {
            done.fail(new Error(`Fail to keep size and position of the windows in previous session with error: ${err}`));
        };
    });
}) : describe.skip();
