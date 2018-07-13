const Application = require('./spectronSetup');
const WindowsActions = require('./spectronWindowsActions');

let app;
let window;
let defaultPosition; 
let defaultSize;

describe('Tests for Opening Shortcut Modal', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication()
            window = await new WindowsActions(app)
            done()
        } catch(err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    afterAll(async (done) => {
        await window.dragWindows(defaultPosition["x"], defaultPosition["y"]); // Exit maximize mode
        await window.resizeWindows(defaultSize["width"], defaultSize["height"]);
        await window.dragWindows(defaultPosition["x"], defaultPosition["y"]); // Drag to defaultPosition
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.stop().then(() => {
                done();
            }).catch((err) => {
                done();
            });
        }
    });

    /**
     * Keep size and position of the windows in previous session
     * TC-ID: 2915948
     * Cover scenarios in AVT-914
     */
    it('Keep size and position of the windows in previous session', async (done) => {
        try {
            defaultPosition = await window.getCurrentWindowsPosition();
            defaultSize = await window.getCurrentWindowsSize();

            // Size and position of previos session keep after resizing and dragging
            await window.dragWindows(defaultPosition["x"], 20);
            await window.resizeWindows(defaultSize["width"] - 100, defaultSize["height"] - 100);
            var previousPosition = await window.getCurrentWindowsPosition();
            var previousSize = await window.getCurrentWindowsSize();
            await app.stop();
            app = await new Application({}).startApplication();
            window = await new WindowsActions(app)
            expect(previousPosition).toEqual(await window.getCurrentWindowsPosition());
            expect(previousSize).toEqual(await window.getCurrentWindowsSize());

            // Size and position of previos session keep after maximizing
            await window.maximizeWindows();
            previousSize = await window.getCurrentWindowsSize();
            await app.stop();
            app = await new Application({}).startApplication();
            window = await new WindowsActions(app)
            expect(previousSize).toEqual(await window.getCurrentWindowsSize());
            done();
        } catch(err) {
            done.fail(new Error(`Fail to keep size and position of the windows in previous session with error: ${err}`));
        };
    });
});