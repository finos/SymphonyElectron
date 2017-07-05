const Application = require('./spectronSetup');
const path = require('path');

describe('Tests for clipboard', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    let app;

    beforeAll(() => {
        app = new Application({});
    });

    afterAll(() => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            return app.stop();
        }
    });

    it('should launch the app', () => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            return app.client.waitUntilWindowLoaded().then(async () => {
                const count = await app.client.getWindowCount();
                expect(count === 1).toBeTruthy();
            })
        });
    });

    it('should check window count', () => {
        return app.client.url('file:///' + path.join(__dirname, '..', 'demo/index.html'))
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
                app.electron.clipboard.writeText(value)
                    .electron.clipboard.readText().then(function (clipboardText) {
                    expect(clipboardText === 'Test').toBeTruthy();
                });
            });
    });

    it('should verify electron clipboard copy', () => {
        return app.electron.clipboard.writeText('Testing copy')
            .electron.clipboard.readText().then(function (clipboardText) {
                return app.client.setValue('#tag', clipboardText).getValue('#tag').then((value) => {
                    expect(value === 'Testing copy').toBeTruthy();
                });
            });
    });
});