const ui = require('./spectronInterfaces.js');

class Actions {
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
        var shortcutItems = [];
        shortcutItems.push({
            key:   "CTRL + ALT + C", value: "New chat",
            key:   "CTRL + ALT + A", value: "New blast",
            key:   "CTRL + ALT + P", value: "New post",
            key:   "CTRL + B", value: "Bold font",
            key:   "CTRL + I", value: "Italic font",
        });
        
        
    }    
}

module.exports = Actions;