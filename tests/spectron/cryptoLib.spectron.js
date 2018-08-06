const Application = require('./spectronSetup');
const path = require('path');
const Utils = require('./spectronUtils');

let app = new Application({});
let encryptedValue = 'Ui3B8JlWfQf0fzejKoRCfWQ6jNy/5cDJdZiivSVV0aqMsI5IWQ27PaewixBWgog4xfYeY5O6egq8yfZidvxuzg9OF2jN34hTuy1VGw==';
let decryptedValue = '2TEyJfiEBuWlWQnFr/UmmoanqVMVNPfaLkwwPYoxinIcPAyVlWgJUy/PDiRJprUlsWrt9aoN5le6Y3s5';

describe('Tests for native encryption and decryption', () => {

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

    it('should encrypt the content', function () {
        app.client.waitForExist('#encrypt', 2000);
        app.client.click('#encrypt');

        Utils.sleep(2000);
        app.client.getText('#encrypted-result').then(data => {
            expect(data).toBe(encryptedValue);
        });
    });

    it('should decrypt the content', function () {
        app.client.waitForExist('#decrypt', 2000);
        app.client.click('#decrypt');

        Utils.sleep(2000);
        app.client.getText('#decrypted-result').then(data => {
            expect(data).toBe(decryptedValue);
        });
    });
});