const robot = require('robotjs');
const constants = require('./spectronConstants.js');
const Utils = require('./spectronUtils.js');
const fs = require('fs');
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
        await this.app.browserWindow.restore();
        await this.app.browserWindow.setAlwaysOnTop(true);
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

    async verifyLogExported() {
        let expected = false;
        let path = await Utils.getFolderPath('Downloads');
        var listFiles = Utils.getFiles(path);
        listFiles.forEach(function (fileName) {
            if (fileName.indexOf(constants.LOG_FILENAME_PREFIX) > -1) {
                expected = true;
            }
        })
        await expect(expected).toBeTruthy();
    }

    async deleteAllLogFiles() {
        let path = await Utils.getFolderPath('Downloads');
        var listFiles = Utils.getFiles(path);
        await listFiles.forEach(function (fileName) {
            if (fileName.indexOf(constants.LOG_FILENAME_PREFIX) > -1) {
                fs.unlinkSync(path.concat("\\", fileName));
            }
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

    async verifyMinimizeWindows() {
        await this.app.browserWindow.isMinimized().then(async function (minimized) {
            await expect(minimized).toBeTruthy();
        }).catch((err) => {
            console.log("error:" + err.name);
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

    async pressCtrlR() {
        await robot.keyToggle('r', 'down', ['control']);
        await robot.keyToggle('r', 'up', ['control']);
    }

    async focusWindow() {
        this.app.browserWindow.focus();
        this.app.browserWindow.setAlwaysOnTop(true);
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

    async reload() {
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + 200;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick('right');
            await robot.setKeyboardDelay(2000);
            await robot.keyTap('right');
            await robot.keyTap('down');
            await robot.keyTap('enter');
        }).catch((err1) => {
            console.log("Message:" + err1);
        });
    }

    async clickNotification() {
        let screen = await this.app.electron.screen.getAllDisplays();
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(50);
            let x = screen[0].bounds.width - 50;
            let y = screen[0].bounds.height - 100;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick();
        });
    }

    async mouseMoveNotification() {
        let screen = await this.app.electron.screen.getAllDisplays();
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(50);
            let x = screen[0].bounds.width - 50;
            let y = screen[0].bounds.height - 100;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
        });
    }

    async mouseMoveCenter() {
        let screen = await this.app.electron.screen.getAllDisplays();
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(50);
            let x = screen[0].bounds.width - 500;
            let y = screen[0].bounds.height - 100;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
        });
    }

    async veriryPersistToastNotification(message) {
        var i = 0;
        while (i < 6) {
            await Utils.sleep(1);
            await i++;
        }
        await this.webAction.verifyToastNotificationShow(message);
        await this.clickNotification();
        await this.mouseMoveCenter();
    }

    async verifyNotPersistToastNotification(message) {
        var i = 0;
        let count = 0;

        while (i < 11) {
            await Utils.sleep(1);
            await i++;
        }
        await this.webAction.verifyNoToastNotificationShow(message);
        await this.mouseMoveCenter();
    }

    async verifyNotCloseToastWhenMouseOver(message) {
        await this.mouseMoveNotification();
        var i = 0;
        while (i < 8) {
            await Utils.sleep(1);
            await i++;
        }
        await this.webAction.verifyToastNotificationShow(message);
        await this.mouseMoveCenter();
    }

    async getBadgeCount() {
        let count = await this.app.electron.remote.app.getBadgeCount();
        console.log(count);
        return count;
    }

    async resetBadgeCount() {
        await this.app.electron.remote.app.setBadgeCount(0);
    }

    async getBadgeCount() {
        let count = await this.app.electron.remote.app.getBadgeCount();
        return count;
    }

    async verifyCurrentBadgeCount(number) {
        let expected = false;
        var i = 0;
        var count = await this.getBadgeCount();
        while (i < 5) {
            if (count == number) {
                expected = true;
                break;
            }
            await Utils.sleep(1);
            count = await this.getBadgeCount();
            await i++;
        }
        await expect(expected).toBeTruthy();
    }

}

module.exports = WindowsActions;
