const Application = require('./spectronSetup');
const path = require('path');

let app = new Application({});

describe('Tests for pop outs reload scenario', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            done();
        }).catch((err) => {
            console.error(`Unable to start application: ${err}`);
            expect(err).toBeNull();
            done();
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
                expect(err).toBeNull();
            });
        }).catch((err) => {
            expect(err).toBeNull();
        });
    });

    it('should load the demo page', () => {
        return app.client.url('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'));
    });

    it('should open a new window and verify', function (done) {
        app.client.waitForExist('#open-win', 2000);
        app.client.moveToObject('#open-win', 10, 10);
        app.client.leftClick('#open-win', 10, 10);

        setTimeout(() => {
            app.client.getWindowCount().then((count) => {
                expect(count === 2).toBeTruthy();
                done();
            });
        }, 2000);
    });

    it('should open a child window from pop-out and verify', function (done) {
        return app.client.windowByIndex(1).then(() => {
            app.client.waitForExist('#open-win', 2000);
            app.client.moveToObject('#open-win', 10, 10);
            app.client.leftClick('#open-win', 10, 10);

            setTimeout(() => {
                app.client.getWindowCount().then((count) => {
                    expect(count === 3).toBeTruthy();
                    done();
                });
            }, 2000);
        });
    });

    it('should close pop-out window when main window is reloaded', function (done) {
        return app.client.windowByIndex(0).then(() => {
            app.browserWindow.reload();

            setTimeout(() => {
                app.client.getWindowCount().then((count) => {
                    expect(count === 1).toBeTruthy();
                    done();
                });
            }, 2000);
        });
    });
});