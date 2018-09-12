const Application = require('./spectronSetup');
const path = require('path');
const WebActions = require('./spectronWebActions');
const ifc = require('./spectronInterfaces.js');
let mainApp = new Application({});
let app,webActions;

describe('Tests for clipboard', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll(async (done) => {
        try {
            let testHost = await 'file:///' + path.join(__dirname, '..', '..', 'demo/index.html');
            app = await mainApp.startApplication({testedHost:testHost, alwaysOnTop: false });
            webActions = await new WebActions(app);
            webActions.fillTagText("Test")
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

    it('should verify electron clipboard', async () => {
        let valueTag = await app.client.getValue(ifc.TAG_TEXTBOX);
        await app.electron.clipboard.writeText(valueTag);
        let clipboardText = await app.electron.clipboard.readText();
        expect(clipboardText === valueTag).toBeTruthy();
        let tempText = "Testing copy";
        await app.electron.clipboard.writeText(tempText);
        clipboardText = await app.electron.clipboard.readText();
        await  app.client.setValue(ifc.TAG_TEXTBOX, clipboardText);  
        valueTag = await app.client.getValue(ifc.TAG_TEXTBOX);
        expect(clipboardText === valueTag).toBeTruthy();
     
    });  
});
