const robot = require('robotjs');

const constants = require('./spectronConstants.js');
const WebActions = require ('./spectronWebActions.js');

class WindowsActions {
    constructor(app) {
        this.app = app;

    }

    async getCurrentSize() {
        return this.app.browserWindow.getSize();
    }

    async setSize(width, height) {
        await this.app.browserWindow.setSize(width, height);
    }

    async resizeWindows(width, height) {
        await this.app.browserWindow.getBounds().then((bounds) => {
            let x = bounds.x + (bounds.width - width);
            let y = bounds.y + (bounds.height - height);
            robot.setMouseDelay(500);
            robot.moveMouse(bounds.x, bounds.y);
            robot.mouseToggle("down");
            robot.dragMouse(x, y);
            robot.mouseToggle("up");
        })
    }

    async getCurrentPosition() {
        return this.app.browserWindow.getPosition();
    }

    async setPosition(x, y) {
        await this.app.browserWindow.setPosition(x, y);
    }

    async dragWindows(x, y) {
        await this.app.browserWindow.getBounds().then((bounds) => {
            robot.setMouseDelay(500);
            robot.moveMouse(bounds.x + 200, bounds.y + 10);
            robot.mouseToggle("down");
            robot.moveMouse(bounds.x + 205, bounds.y + 10); // Workaround to make this keyword works properly, refer: https://github.com/octalmage/robotjs/issues/389
            robot.dragMouse(x + 205, y + 10);
            robot.mouseToggle("up");
        })
    }

    async sleep(ms){
        return new Promise(resolve=>{
            setTimeout(resolve,ms)
        })
    }    

    async verifyMinimizeWindows() {
        await this.app.browserWindow.isMinimized().then(async function (minimized) {
            await expect(minimized).toBeTruthy();
        }).catch((err) => {
            console.log(err.name);
        });;
    }

    async isMinimizedWindows() {
        let rminimized = -1;

        await this.app.browserWindow.isMinimized().then(async function (minimized) {
            rminimized = constants.MINIMIZED;
        }).catch((err) => {
            rminimized = constants.QUIT;            
            return rminimized;
        });

        return rminimized;
    }
    
    async selectMinimizeOnClose() {
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + 35;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick();
            await this.webAction.openApplicationMenuByClick();
            await robot.setKeyboardDelay(1000);
            await robot.keyTap('enter');
            await robot.keyTap('down');
            await robot.keyTap('down');
            await robot.keyTap('right');
            for (let i = 0; i < 4; i++) {
                await robot.keyTap('down');
            }
            await robot.keyTap('enter');
        });
    }

    async quitApp() {
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + 35;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick();
            await this.webAction.openApplicationMenuByClick();
            await robot.setKeyboardDelay(1000);
            await robot.keyTap('enter');
            await robot.keyTap('down');
            await robot.keyTap('down');
            await robot.keyTap('right');
            for (let i = 0; i < 6; i++) {
                await robot.keyTap('down');
            }
            await robot.keyTap('enter');
        });
    }
    async pressCtrlW()
    {	
        await robot.keyToggle('w', 'down', ['control']);
        await robot.keyToggle('w', 'up', ['control']);
    }
    async focusWindow()
    {
        await this.app.browserWindow.show();     
    }

}

module.exports = WindowsActions;
