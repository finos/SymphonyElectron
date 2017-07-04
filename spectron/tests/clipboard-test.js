const Application = require('../app');
const path = require('path');
const assert = require('assert');

describe('Tests for clipboard', () => {
    let app;

    before(() => {
        app = new Application({});
    });

    after(() => {
        if (app && app.isRunning()) {
            return app.stop();
        }
    });

    it('should launch the app', () => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            app.client.waitUntilWindowLoaded().getWindowCount()
                .should.eventually.equal(1);
        });
    });

    it('should check window count', () => {
        return app.client.url('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'))
    });

    it('should set the username field', () => {
        return app.client
            .windowByIndex(0)
            .setValue('#tag', 'Test')
            .getValue('#tag')
            .should.eventually.equal('Test')
    });

    it('should verify electron clipboard', (done) => {
        app.client
            .getValue('#tag').then((value) => {
                app.electron.clipboard.writeText(value)
                    .electron.clipboard.readText().then(function (clipboardText) {
                        assert(clipboardText, 'Test');
                        done();
                    });
            });
    });

    it('should verify electron clipboard copy', (done) => {
        app.electron.clipboard.writeText('Testing copy')
            .electron.clipboard.readText().then(function (clipboardText) {
                app.client
                    .setValue('#tag', clipboardText)
                    .getValue('#tag').then((value) => {
                        assert(value, 'Testing copy');
                        done();
                    });
            });
    });
});