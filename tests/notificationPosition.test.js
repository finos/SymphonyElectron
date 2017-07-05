const Application = require('./spectronSetup');
const path = require('path');

describe('Tests for Notification position', () => {

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

    it('should load demo html page', () => {
        let filePath;
        if (process.platform === 'win32') {
            filePath = 'file:///' + path.join(__dirname, '..', 'demo/index.html');
        } else {
            filePath = 'file://$(pwd)/' + path.join(__dirname, '..', 'demo/index.html')
        }
        return app.client.url(filePath);
    });

    it('should load demo html', async () => {
        return app.client.waitUntilWindowLoaded().then(async () => {
            const title = await app.client.getTitle();
            expect(title === '').toBeTruthy();
        });
    });

    it('should open notification configure window', () => {
        return app.client
            .click('#open-config-win')
            .windowByIndex(1)
            .click('#upper-left')
            .click('#ok-button')
            .windowByIndex(0)
            .click('#notf')
            .windowByIndex(1)
    });

    it('should check notification position', async () => {
        const bounds = await app.browserWindow.getBounds();
        expect(bounds.x === 0).toBeTruthy();
        expect(bounds.y > 0).toBeTruthy();
    });

    it('should change the window', () => {
        return app.client.windowByIndex(0).then(async () => {
            const title = await app.browserWindow.getTitle();
            expect(title === 'Symphony | Secure Seamless Communication').toBeTruthy();
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
            .windowByIndex(1).then(async () => {
                const title = await app.browserWindow.getTitle();
                expect(title === 'Electron').toBeTruthy();
            });
    });

    it('should check notification position and equal to lower-right', async () => {
        const bounds = await app.browserWindow.getBounds();
        expect(bounds.x > 0).toBeTruthy();
        expect(bounds.y > 0).toBeTruthy();
    });

    it('should change the window', () => {
        return app.client
            .windowByIndex(0).then(async () => {
                const title = await app.browserWindow.getTitle();
                expect(title === 'Symphony | Secure Seamless Communication').toBeTruthy();
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
            .windowByIndex(1).then(async () => {
                const title = await app.browserWindow.getTitle();
                expect(title === 'Electron').toBeTruthy();
            });
    });

    it('should check notification position and equal to upper-right', async () => {
        const bounds = await app.browserWindow.getBounds();
        expect(bounds.x > 0).toBeTruthy();
        expect(bounds.y > 0).toBeTruthy();
    });

    it('should change the window to main', () => {
        return app.client
            .windowByIndex(0).then(async () => {
                const title = await app.browserWindow.getTitle();
                expect(title === 'Symphony | Secure Seamless Communication').toBeTruthy();
            });
    });

    it('should open notification and close', () => {
        return app.client
            .windowByIndex(0)
            .click('#notf')
            .getWindowCount().then((count) => {
                expect(count === 3).toBeTruthy();
            })
            .windowByIndex(1).then(() => {
                return app.browserWindow.getTitle().then((title) => {
                    expect(title === 'Electron').toBeTruthy();
                });
            });
    });

});