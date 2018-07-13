const Application = require('./spectronSetup');
const WindowsActions = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');

let app;
let windowActions;
let webActions;
let defaultPosition; 
let defaultSize;

describe('Tests for Keeping size and position of the windows in previous session', () => {

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
            await webActions.clickMaximizeButton(); // Click maximize button again to exit maximize mode
            await windowActions.resizeWindows(defaultSize["width"], defaultSize["height"]);
            await windowActions.dragWindows(defaultPosition["x"], defaultPosition["y"]); // Drag to defaultPosition
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
            defaultPosition = await windowActions.getCurrentWindowsPosition();
            defaultSize = await windowActions.getCurrentWindowsSize();

            // Size and position of previos session keep after resizing and dragging
            await windowActions.dragWindows(defaultPosition["x"], 20);
            await windowActions.resizeWindows(defaultSize["width"] - 100, defaultSize["height"] - 100);
            var previousPosition = await windowActions.getCurrentWindowsPosition();
            var previousSize = await windowActions.getCurrentWindowsSize();
            await app.stop();
            app = await new Application({}).startApplication();
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            expect(previousPosition).toEqual(await windowActions.getCurrentWindowsPosition());
            expect(previousSize).toEqual(await windowActions.getCurrentWindowsSize());

            // Size and position of previos session keep after maximizing
            await webActions.maximizeWindows();
            previousSize = await windowActions.getCurrentWindowsSize();
            await app.stop();
            app = await new Application({}).startApplication();
            windowActions = await new WindowsActions(app);
            webActions = await new WebActions(app);
            expect(previousSize).toEqual(await windowActions.getCurrentWindowsSize());
            done();
        } catch(err) {
            done.fail(new Error(`Fail to keep size and position of the windows in previous session with error: ${err}`));
        };
    });
});
