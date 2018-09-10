const Application = require('./spectronSetup');
const path = require('path');
const { isMac } = require('../../js/utils/misc');

let mainApp = new Application({});
let app;

describe('Tests for Notification position', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            let testHost = await 'file:///' + path.join(__dirname, '..', '..', 'demo/index.html')
            app = await mainApp.startApplication({testedHost:testHost, alwaysOnTop: false })
            await done();
        } catch (err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
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

    it('should check notification position', (done) => {
        return app.browserWindow.getBounds().then((bounds) => {
            expect(bounds.x === 0).toBeTruthy();
            if (isMac) {
                expect(bounds.y > 0).toBeTruthy();
                done();
            } else {
                expect(bounds.y === 0).toBeTruthy();
                done();
            }
        }).catch((err) => {
            done.fail(new Error(`notificationPosition failed in getBounds with error: ${err}`));
        });
    });

    it('should change the window', (done) => {
        return app.client.windowByIndex(0).then(() => {
            return app.browserWindow.getTitle().then((title) => {
                expect(title === 'Symphony | Secure Seamless Communication').toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`notificationPosition failed in getTitle with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`notificationPosition failed in windowByIndex with error: ${err}`));
        });
    });

    it('should change notification position to lower-right', (done) => {
        return app.client
            .click('#open-config-win')
            .windowByIndex(2)
            .click('#lower-right')
            .click('#ok-button')
            .windowByIndex(0)
            .click('#notf')
            .windowByIndex(1).then(() => {
                return app.browserWindow.getTitle().then((title) => {
                    expect(title === 'Electron').toBeTruthy();
                    done();
                }).catch((err) => {
                    done.fail(new Error(`notificationPosition failed in getTitle with error: ${err}`));
                });
            }).catch((err) => {
                done.fail(new Error(`notificationPosition failed in windowByIndex with error: ${err}`));
            });
    });

    it('should check notification position and equal to lower-right', (done) => {
        return app.browserWindow.getBounds().then((bounds) => {
            expect(bounds.x > 0).toBeTruthy();
            expect(bounds.y > 0).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`notificationPosition failed in getBounds with error: ${err}`));
        });
    });

    it('should change the window', (done) => {
        return app.client.windowByIndex(0).then(() => {
            return app.browserWindow.getTitle().then((title) => {
                expect(title === 'Symphony | Secure Seamless Communication').toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`notificationPosition failed in getTitle with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`notificationPosition failed in windowByIndex with error: ${err}`));
        });
    });

    it('should change notification position to upper-right', (done) => {
        return app.client
            .click('#open-config-win')
            .windowByIndex(3)
            .click('#upper-right')
            .click('#ok-button')
            .windowByIndex(0)
            .click('#notf')
            .windowByIndex(1).then(() => {
                return app.browserWindow.getTitle().then((title) => {
                    expect(title === 'Electron').toBeTruthy();
                    done();
                }).catch((err) => {
                    done.fail(new Error(`notificationPosition failed in getTitle with error: ${err}`));
                });
            }).catch((err) => {
                done.fail(new Error(`notificationPosition failed in windowByIndex with error: ${err}`));
            });
    });

    it('should check notification position and equal to upper-right', (done) => {
        return app.browserWindow.getBounds().then((bounds) => {
            expect(bounds.x > 0).toBeTruthy();
            if (isMac) {
                expect(bounds.y > 0).toBeTruthy();
                done();
            } else {
                expect(bounds.y === 0).toBeTruthy();
                done();
            }
        }).catch((err) => {
            done.fail(new Error(`notificationPosition failed in getBounds with error: ${err}`));
        });
    });

    it('should change the window to main', (done) => {
        return app.client.windowByIndex(0).then(() => {
            return app.browserWindow.getTitle().then((title) => {
                expect(title === 'Symphony | Secure Seamless Communication').toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`notificationPosition failed in getTitle with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`notificationPosition failed in windowByIndex with error: ${err}`));
        });
    });

    it('should open notification and close', (done) => {
        return app.client
            .windowByIndex(0)
            .click('#notf')
            .getWindowCount().then((count) => {
                expect(count === 4).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`notificationPosition failed in getWindowCount with error: ${err}`));
            })
            .windowByIndex(1).then(() => {
                return app.browserWindow.getTitle().then((title) => {
                    expect(title === 'Electron').toBeTruthy();
                    done();
                }).catch((err) => {
                    done.fail(new Error(`notificationPosition failed in getTitle with error: ${err}`));
                });
            }).catch((err) => {
                done.fail(new Error(`notificationPosition failed in windowByIndex with error: ${err}`));
            });
    });

});
