const robot = require('robotjs');
const constants = require('./spectronConstants.js');
const WebActions = require('./spectronWebActions.js')

class WindowsActions {
    constructor(app) {
        this.app = app;
        this.webAction = new WebActions(app);
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

    async showWindow() {
        await this.app.browserWindow.show();
    }

    async clickOutsideWindow() {
        await this.setPosition(0, 0);
        var currentSize = await this.getCurrentSize();
        await robot.moveMouse(currentSize[0] + 20, currentSize[1] + 20);
        await robot.mouseClick();
    }

    async verifyWindowsOnTop() {
        await this.app.browserWindow.isAlwaysOnTop().then(function (isAlwaysOnTop) {
            expect(isAlwaysOnTop).toBeTruthy();
        })
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
            await arrStep.push(item);
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
            await robot.setKeyboardDelay(200);
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

}

module.exports = WindowsActions;
