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

    async clickMinimizeButton(){
        await this.app.client.waitForVisible(ui.MINIMIZE_BTN, 10000).click(ui.MINIMIZE_BTN);
    }

    async minimizeWindows() {
        await this.clickMinimizeButton();
        await this.app.browserWindow.isMinimized().then(function (isMinimized) {
            expect(isMinimized).toBeTruthy();
        })
    }

    async openApplicationMenuByClick() {
        await this.app.client.click(ui.MAIN_MENU_ITEM);
    }
}

module.exports = WebActions;
