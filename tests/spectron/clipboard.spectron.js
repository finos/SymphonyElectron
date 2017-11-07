const Application = require('./spectronSetup');
const path = require('path');
let app = new Application({});

describe('Tests for clipboard', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
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
                expect(err).toBeFalsy();
            });
        }).catch((err) => {
            expect(err).toBeFalsy();
        });
    });

    it('should check window count', () => {
        return app.client.url('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'));
    });

    it('should set the username field', () => {
        return app.client
            .windowByIndex(0)
            .setValue('#tag', 'Test')
            .getValue('#tag').then((value) => {
                expect(value === 'Test').toBeTruthy();
            });
    });

    it('should verify electron clipboard', () => {
        return app.client
            .getValue('#tag').then((value) => {
                return app.electron.clipboard.writeText(value)
                    .electron.clipboard.readText().then((clipboardText) => {
                        expect(clipboardText === 'Test').toBeTruthy();
                    });
            });
    });

    it('should verify electron clipboard copy', () => {
        return app.electron.clipboard.writeText('Testing copy')
            .electron.clipboard.readText().then((clipboardText) => {
                return app.client.setValue('#tag', clipboardText).getValue('#tag').then((value) => {
                    expect(value === 'Testing copy').toBeTruthy();
                });
            });
    });
});