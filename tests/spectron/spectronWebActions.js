const ui = require('./spectronInterfaces.js');

class WebActions {
    constructor(app) {
            this.app = app;
    }
    
    async login(username, password){
        await this.app.client.waitForVisible(ui.LOGIN_EMAIL_TBX)
            .setValue(ui.LOGIN_EMAIL_TBX,username)
            .setValue(ui.LOGIN_PASSWORD_TBX,password)
            .click(ui.LOGIN_SUBMIT_BTN)
            .pause(5000) //pause a few seconds to workarround `Failed To Start App` issue
            .waitForVisible(ui.LEFTNAV_AVATAR_IMG, 60000);
    }

    async openShortcutModal(){
        await this.app.client.waitForVisible(ui.TOOLBAR_SETTINGS_ICO, 60000)
            .click(ui.TOOLBAR_SETTINGS_ICO)
            .click(ui.TOOLBAR_SHORTCUT_OPT)
            .waitForVisible(ui.SHORTCUT_MODAL_BOX);
    }

    async verifyShortcutModalCorrect(){
        var shortcutItems = require('../../tests/testdata/shortcuts.json');
        for (var title in shortcutItems){
            for (var command in shortcutItems[title]){
                this.app.client.waitForVisible("//div[@class='shortcuts__title' and normalize-space()='"
                + title +"']/following-sibling::div//span[normalize-space()='"
                + command +"']/following-sibling::span[normalize-space()='"
                + shortcutItems[title][command] +"']");
            }
        }
    }
}

module.exports = WebActions;
