const Application = require('./spectronSetup');
const path = require('path');
const { buildNumber } = require('../../package');
const bluebird = require('bluebird');

let app = new Application({});

describe('Tests for getVersionInfo API', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            done();
        }).catch((err) => {
            console.error(`Unable to start application error: ${err}`);
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

    it('should load demo html page', () => {
        return app.client.url('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'));
    });

    it('should verify if the version numbers are correct', function (done) {
        app.client.waitForExist('#get-version', 2000);
        app.client.click('#get-version');

        bluebird.all([
            '#api-version',
            '#container-identifier',
            '#container-ver',
            '#build-number'
        ]).mapSeries((string) => {
            return app.client.getText(string)
        }).then((values) => {
            expect(values[ 0 ]).toBe('1.0.0');
            expect(values[ 1 ]).toBe('Electron');
            expect(values[ 2 ]).toBe('1.8.3');
            expect(values[ 3 ]).toBe(buildNumber);
            done();
        });
    });
});