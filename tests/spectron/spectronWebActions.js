const ui = require('./spectronInterfaces.js');

class WebActions {
    constructor(app) {
            this.app = app;
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
