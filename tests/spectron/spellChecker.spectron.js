const Application = require('./spectronSetup');
const path = require('path');
const {isMac} = require('../../js/utils/misc.js');
const robot = require('robotjs');
let app = new Application({});

describe('Tests for spellChecker', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        app.startApplication().then((startedApp) => {
            app = startedApp;
            done();
        }).catch((err) => {
            done.fail(new Error(`Unable to start application error: ${err}`));
        });
    });

    afterAll((done) => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.stop().then(() => {
                done();
            }).catch((err) => {
                done();
            });
        }
    });

    it('should launch the app', (done) => {
        return app.client.waitUntilWindowLoaded().then(() => {
            return app.client.getWindowCount().then((count) => {
                expect(count === 1).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`spellChecker failed in getWindowCount with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`spellChecker failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check window count', () => {
        return app.client.url('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'));
    });

    it('should set the misspelled word', () => {
        return app.client
            .windowByIndex(0)
            .setValue('#tag', 'comming ')
            .getValue('#tag').then((value) => {
                expect(value === 'comming ').toBeTruthy();
            });
    });

    it('should bring the app to front in windows', (done) => {
        if (!isMac) {
            app.browserWindow.focus();
            app.browserWindow.restore();
            app.browserWindow.getBounds().then((bounds) => {
                robot.setMouseDelay(100);
                let x = bounds.x + 200;
                let y = bounds.y + 200;
                robot.moveMouseSmooth(x, y);
                robot.mouseClick();
                done();
            });
        } else {
            done();
        }
    });

    it('should invoke context menu ', (done) => {
        if (isMac) {
            const tag = app.client.$('#tag');
            tag.waitForExist('#tag', 2000);
            tag.moveToObject('#tag', 10, 10);
            tag.rightClick('#tag', 10, 10);

            // Timeout is required for context menu to appear
            setTimeout(() => {
                robot.setKeyboardDelay(500);
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('enter');
                done();
            }, 2000);
        } else {
            const tag = app.client.$('#tag');
            tag.waitForExist('#tag', 2000);
            tag.moveToObject('#tag', 10, 10);
            tag.rightClick('#tag', 10, 10);

            // Timeout is required for context menu to appear
            setTimeout(() => {
                robot.setKeyboardDelay(500);
                robot.keyTap('down');
                robot.keyTap('down');
                robot.keyTap('enter');
                done();
            }, 2000);
        }
    });

    it('should verify the text field', () => {
        return app.client
            .windowByIndex(0)
            .getValue('#tag').then((value) => {
                expect(value !== 'comming').toBeTruthy();
            });
    });

});
