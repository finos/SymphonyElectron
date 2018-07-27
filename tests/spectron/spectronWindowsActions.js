const robot = require('robotjs');
const constants = require('./spectronConstants.js');
const WebActions = require('./spectronWebActions.js')

class WindowsActions {
    constructor(app) {
        this.app = app;       
        this.webAction = new WebActions(app);
    }

    async verifyMinimizeWindows() {
        await this.app.browserWindow.isMinimized().then(async function (minimized) {
            await expect(minimized).toBeTruthy();
        }).catch((err) => {
            console.log("error:"+err.name);
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

    async pressCtrlW() {
        await robot.keyToggle('w', 'down', ['control']);
        await robot.keyToggle('w', 'up', ['control']);
    }
    async pressCtrlM() {
        await robot.keyToggle('m', 'down', ['control']);
        await robot.keyToggle('m', 'up', ['control']);
    }
    async focusWindow() {
        await this.app.browserWindow.show();
    }

    async menuSearch(element, namevalue) {
        if (element.name == namevalue) {           
            return await element;
        }
        else if (element.items !== undefined) {
            var result;
            for (var i = 0; result == null && i < element.items.length; i++) {
                result = await this.menuSearch(element.items[i], namevalue);
                result;
            }
            return await result;
        }
        return await null;
    }

    async openMenu(arrMenu) {
        var arrStep = [];
        for (var i = 0; i < arrMenu.length; i++) {
            var item = await this.menuSearch(constants.MENU.root, arrMenu[i]);
            await  arrStep.push(item);
        }       
        await this.actionForMenus(arrStep);
        return arrStep;
    }

    async actionForMenus(arrMenu) {
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
            for (var i = 0; i < arrMenu.length; i++) {
                
                for (var s = 0; s < arrMenu[i].step; s++) {
                    await robot.keyTap('down');
                }
                if (arrMenu.length > 1 && i != arrMenu.length - 1) {
                    //handle right keygen
                    await robot.keyTap('right');
                }
            }
            await robot.keyTap('enter');
        });
    }   

    async reload()
    {
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + 200;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick('right');
            await robot.setKeyboardDelay(1000);
            await robot.keyTap('right');           
            await robot.keyTap('enter');           
          });
    }
    
    async clickNotification()
    {
        await this.app.browserWindow.getBounds().then(async (bounds) => {        
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + bounds.height-20;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);   
            await robot.mouseClick();           
          });
    }
    timeOut(second)
    {
        return second*1000;
    }
}

module.exports = WindowsActions;
