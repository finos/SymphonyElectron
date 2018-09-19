const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc.js');
const Utils = require('./spectronUtils');
var app = new Application({});
const WindowsAction = require('./spectronWindowsActions');
const WebActions = require('./spectronWebActions');
const ifc = require('./spectronInterfaces.js');
const specconst = require('./spectronConstants.js');
let webActions, windowAction;

!isMac ? describe(' Open ACP inside Electron when clicking on the "Go to AC portal"', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
    let originalTimeout = Application.getTimeOut();
    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication({ testedHost: specconst.TESTED_HOST, alwaysOnTop: true });
            windowAction = await new WindowsAction(app);
            webActions = await new WebActions(app);
            done();
        } catch (err) {
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });
    afterAll(async (done) => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        try {
            if (app && app.isRunning()) {
                await app.stop();
                await windowAction.closeChromeDriver();
                done();
            }
        } catch (err) {
            await app.stop();
            await windowAction.closeChromeDriver();
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });

    /**
    * The user is directed to the ACP inside Electron and does not login again
    * TC-ID: 131251
    * Cover scenarios in AVT-1107
    */
    it('The user is directed to the ACP inside Electron and does not login again', async (done) => {
        try {
            await webActions.login(specconst.USER_A);           
            await app.client.waitForVisible(ifc.SETTTING_BUTTON, Utils.toMs(50));
            await windowAction.pressF11();
            await webActions.openACP();
            await app.client.waitForVisible(ifc.IMG_ADMIN_LOGO, Utils.toMs(20));
            await webActions.verifyElementExist(ifc.IMG_ADMIN_LOGO);
            await done();
        } catch (err) {
            done.fail(new Error(`Fail to verify open ACP: ${err}`));
        };
    });

}) : describe.skip();
