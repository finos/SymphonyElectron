const ui = require('./spectronInterfaces.js');

class WebActions {
    constructor(app) {
            this.app = app;
    }    

    async clickMaximizeButton(){
        await this.app.client.waitForVisible(ui.MAXIMIZE_BTN, 10000).click(ui.MAXIMIZE_BTN);
    }

    async maximizeWindows() {
        await this.clickMaximizeButton();
        await this.app.browserWindow.isMaximized().then(function (maximized) {
            expect(maximized).toBeTruthy();
        })
    }

    async minimizeWindowByClick() {       
        await this.app.client.click(ui.MINIMIZED_BUTTON);
    }

    async closeWindowByClick() {        
        await this.app.client.click(ui.CLOSE_BUTTON);
    }

    async openApplicationMenuByClick() {       
        await this.app.client.click(ui.MAIN_MENU_ITEM);
    }

}

module.exports = WebActions;
