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
}

module.exports = WebActions;
