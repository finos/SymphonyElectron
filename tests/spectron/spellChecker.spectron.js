const Application = require('./spectronSetup');
const WebActions = require('./spectronWebActions');
const WindowsActions = require('./spectronWindowsActions');
const constants = require('./spectronConstants.js');
const path = require('path');
const ui = require('./spectronInterfaces.js');
const { isWindowsOS } = require('../../js/utils/misc.js');
let TIMEOUT_TEST_SUITE = parseInt(constants.TIMEOUT_TEST_SUITE, 10);
let app, windowsActions, webActions;

describe('Tests for spellChecker', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = TIMEOUT_TEST_SUITE;

    beforeAll(async (done) => {
        try {
            app = await new Application({}).startApplication({ testedHost: constants.TESTED_HOST, alwaysOnTop: true });
            webActions = await new WebActions(app);
            windowsActions = await new WindowsActions(app);
            done();
        } catch (err) {
            await windowsActions.stopApp();
            done.fail(new Error(`Unable to start application error: ${err}`));
        };
    });

    afterAll(async (done) => {
        try {
            await windowsActions.stopApp();
            done();
        } catch (err) {
            done.fail(new Error(`Failed at post-condition: ${err}`));
        };
    });

    it('SpellChecker should be working', async (done) => {
        try {
            if (await windowsActions.isAppRunning()) {
                let misspelledWord = "comming ";
                await webActions.navigateURL('file:///' + path.join(__dirname, '..', '..', 'demo/index.html'));
                if (isWindowsOS) {
                    await windowsActions.bringToFront("Symphony");
                    await windowsActions.pressF11();
                }
                await webActions.inputText(ui.TAG_TEXTBOX, misspelledWord);
                await webActions.openContextMenu(ui.TAG_TEXTBOX);
                await webActions.selectItemOnContextMenu(3);
                await webActions.verifySpellCheckerWorking(ui.TAG_TEXTBOX, misspelledWord)
            }
            done();
        } catch (err) {
            done.fail(new Error(`Fail to verify spellChecker: ${err}`));
        };
    });
});