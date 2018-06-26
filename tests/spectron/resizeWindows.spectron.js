const Application = require('./spectronSetup');
const robot = require('robotjs');
const { isMac } = require('../../js/utils/misc');

let app = new Application({});
let defaultWidth;
let defaultHeight;

!isMac ? describe('Tests for Resizing windows', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            done();
        }).catch((err) => {
            done.fail(new Error(`Unable to start application error: ${err}`));
        });
    });

    afterAll((done) => {
        if (app && app.isRunning()) {
            // resize to default size
            app.browserWindow.getBounds().then((bounds) => {
                let x = bounds.x - (defaultWidth - bounds.width);
                let y = bounds.y - (defaultHeight - bounds.height);
                robot.moveMouse(bounds.x, bounds.y);
                robot.mouseToggle("down");
                robot.dragMouse(x, y);
                robot.mouseToggle("up");
            })
            //close app
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.stop().then(() => {
                done();
            }).catch((err) => {
                done();
            });
        }
    });

    /**
     * Verify whether the main window can be minimized upto 300px
     * TC-ID: 3028239
     * Cover scenarios in AVT-768
     */
    it('should be minimized up to 300px', (done) => {
        app.browserWindow.getBounds().then((bounds) => {
            defaultHeight = bounds.height;
            defaultWidth = bounds.width;
            let x = bounds.x + bounds.width;
            let y = bounds.y + bounds.height;
            robot.setMouseDelay(500);
            robot.moveMouse(bounds.x, bounds.y);
            robot.mouseToggle("down");
            robot.dragMouse(x, y);
            robot.mouseToggle("up");
            return app.browserWindow.getBounds().then((bounds) => {
                const data = {x: bounds.width, y: bounds.height};
                expect(data).toEqual({x: 300, y: 300});
                done();
            }).catch((err) => {
                done.fail(new Error(`failed to minimize window to 300 px with error: ${err}`));
            })
        });
    });
}) : describe.skip();