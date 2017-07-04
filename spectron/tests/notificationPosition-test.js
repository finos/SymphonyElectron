const Application = require('../app');
const assert = require('assert');
const path = require('path');

describe('Tests for Notification position', () => {

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
            app.client.waitUntilWindowLoaded()
                .getWindowCount().should.eventually.equal(1);
        });
    });

    it('should load demo html page', () => {
        let filePath;
        if (process.platform === 'win32') {
            filePath = 'file:///' + path.join(__dirname, '..', '..', 'demo/index.html');
        } else {
            filePath = 'file://$(pwd)/' + path.join(__dirname, '..', '..', 'demo/index.html')
        }
        return app.client.url(filePath);
    });

    it('should load demo html', () => {
        return app.client.waitUntilWindowLoaded()
            .getTitle().should.eventually.equal('')
    });

    it('should notification configure window', () => {
        return app.client
            .click('#open-config-win')
            .windowByIndex(1)
            .click('#upper-left')
            .click('#ok-button')
            .windowByIndex(0)
            .click('#notf')
            .windowByIndex(1)
    });

    it('should check notification position', () => {
        return app.browserWindow
            .getBounds().then((bounds) => {
                bounds.x.should.be.equal(0);
                bounds.y.should.be.above(0);
            });
    });

    it('should change the window', () => {
        return app.client.windowByIndex(0).then(() => {
            return app.browserWindow.getTitle().should.eventually.equal('Symphony | Secure Seamless Communication')
        });
    });

    it('should change notification position to lower-right', () => {
        return app.client
            .click('#open-config-win')
            .windowByIndex(2)
            .click('#lower-right')
            .click('#ok-button')
            .windowByIndex(0)
            .click('#notf')
            .windowByIndex(1).then(() => {
                return app.browserWindow.getTitle().should.eventually.equal('Electron')
            });
    });

    it('should check notification position and equal to lower-right', () => {
        return app.browserWindow
            .getBounds().then((bounds) => {
                bounds.x.should.be.above(0);
                bounds.y.should.be.above(0);
            });
    });

    it('should change the window', () => {
        return app.client
            .windowByIndex(0).then(() => {
                return app.browserWindow.getTitle().should.eventually.equal('Symphony | Secure Seamless Communication')
            });
    });

    it('should change notification position to upper-right', () => {
        return app.client
            .click('#open-config-win')
            .windowByIndex(2)
            .click('#upper-right')
            .click('#ok-button')
            .windowByIndex(0)
            .click('#notf')
            .windowByIndex(1).then(() => {
                return app.browserWindow.getTitle().should.eventually.equal('Electron')
            });
    });

    it('should check notification position and equal to upper-right', () => {
        return app.browserWindow
            .getBounds().then((bounds) => {
                bounds.x.should.be.above(0);
                bounds.y.should.be.above(0);
            });
    });

    it('should change the window to main', () => {
        return app.client
            .windowByIndex(0).then(() => {
                return app.browserWindow.getTitle().should.eventually.equal('Symphony | Secure Seamless Communication')
            });
    });

    it('should open notification and close', () => {
        return app.client
            .windowByIndex(0)
            .click('#notf')
            .getWindowCount().should.eventually.equal(3)
            .windowByIndex(1).then(() => {
                return app.browserWindow.getTitle().should.eventually.equal('Electron')
            });
    });

});