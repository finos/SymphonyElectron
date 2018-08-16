const robot = require('robotjs');
const constants = require('./spectronConstants.js');
const Utils = require('./spectronUtils.js');
const fs = require('fs');
const WebActions = require('./spectronWebActions.js');
const { isMac, isWindowsOS } = require('../../js/utils/misc');
const ui = require('./spectronInterfaces.js');

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

    async closeWindows() {
        try {
            if (this.app) {
                let isRunning = await this.app.isRunning();
                await this.app.stop();
            }
        }
        catch (error) {
            console.log(error);
        }
    }

    async isElectronProcessRunning() {
        let ret = false;
        if (isWindowsOS) {
            let result = await Utils.execPromise("tasklist | find /i \"electron.exe\"");            
            if (result && result.indexOf('electron.exe') > -1) {
                ret = true;
            }
        }
        return ret;
    }

    async resizeWindows(width, height) {
        await this.app.browserWindow.getBounds().then((bounds) => {
            let x = bounds.x + (bounds.width - width);
            let y = bounds.y + (bounds.height - height);
            robot.setMouseDelay(500);
            // Plus 2 pixels to make sure this function works well on MAC
            robot.moveMouse(bounds.x + 2, bounds.y + 2);
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
        let currentSize = await this.getCurrentSize();
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
        let webAction = await new WebActions(this.app);
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + 35;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick();
            await webAction.openApplicationMenuByClick();
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

    async verifyLogExported() {
        let expected = false;
        let path = await Utils.getFolderPath('Downloads');
        let listFiles = Utils.getFiles(path);
        listFiles.forEach(function (fileName) {
            if (fileName.indexOf(constants.LOG_FILENAME_PREFIX) > -1) {
                expected = true;
            }
        })
        await expect(expected).toBeTruthy();
    }

    async deleteAllLogFiles() {
        let path = await Utils.getFolderPath('Downloads');
        let listFiles = Utils.getFiles(path);
        await listFiles.forEach(function (fileName) {
            if (fileName.indexOf(constants.LOG_FILENAME_PREFIX) > -1) {
                fs.unlinkSync(path.concat("\\", fileName));
            }
        })
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
        let webAction = await new WebActions(this.app);
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + 35;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick();
            await webAction.openApplicationMenuByClick();
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

    async quitApp() {
        let webAction = await new WebActions(this.app);
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(100);
            let x = bounds.x + 95;
            let y = bounds.y + 35;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
            await robot.mouseClick();
            await webAction.openApplicationMenuByClick();
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

    async pressCtrlW() {
        await robot.keyToggle('w', 'down', ['control']);
        await robot.keyToggle('w', 'up', ['control']);
    }

    async verifyMinimizeWindows() {
        let isMinimized = await this.app.browserWindow.isMinimized();
        await expect(isMinimized).toBeTruthy();
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

    async pressCtrlM() {
        await robot.keyToggle('m', 'down', ['control']);
        await robot.keyToggle('m', 'up', ['control']);
    }

    async pressF11() {
        await robot.keyTap('f11');       
    }

    async pressCtrlR() {
        await robot.keyToggle('r', 'down', ['control']);
        await robot.keyToggle('r', 'up', ['control']);
    }

    async focusWindow() {
        this.app.browserWindow.focus();

    }

    async setAlwaysOnTop(value) {
        this.app.browserWindow.setAlwaysOnTop(value);
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

    async clickNotification(x,y) {   
        await robot.setMouseDelay(100);   
        await robot.moveMouseSmooth(x, y);
        await robot.moveMouse(x, y);
        await robot.mouseClick();      
    }

    async mouseMoveNotification(x,y) {
        await robot.setMouseDelay(50);   
        await robot.moveMouseSmooth(x, y);
        await robot.moveMouse(x, y);      
    }

    async mouseMoveCenter() {
        let screen = await this.app.electron.screen.getAllDisplays();
        await this.app.browserWindow.getBounds().then(async (bounds) => {
            await robot.setMouseDelay(50);
            let x = screen[0].bounds.width/2;
            let y = screen[0].bounds.height/2;
            await robot.moveMouseSmooth(x, y);
            await robot.moveMouse(x, y);
        });
    }

    async veriryPersistToastNotification(message) {
        var i = 0;
        while (i < 7) {
            await Utils.sleep(1);
            await i++;
        }

        let currentPosition = await this.getToastNotificationPosition(message);
        let curentSize = await this.getToastNotificationSize(message);
        await this.webAction.verifyToastNotificationShow(message);
        let x = await (currentPosition[0] + curentSize[0]/2);
        let y = await (currentPosition[1] + curentSize[1]/2);        
        await this.clickNotification(x,y);
        await this.mouseMoveCenter();
    }

    async verifyNotPersistToastNotification(message) {
        let i = 0;
        let count = 0;

        while (i < 11) {
            await Utils.sleep(1);
            await i++;
        }
        await this.webAction.verifyNoToastNotificationShow(message);
        await this.mouseMoveCenter();
    }

    async verifyNotCloseToastWhenMouseOver(message) {
        
        var i = 0;
        while (i < 6) {
            await Utils.sleep(1);
            await i++;
        }
        let currentPosition = await this.getToastNotificationPosition(message);
        let curentSize = await this.getToastNotificationSize(message);       
        let x = await (currentPosition[0] + curentSize[0]/2);
        let y = await (currentPosition[1] + curentSize[1]/2);        
        await this.mouseMoveNotification(x,y);
        await this.webAction.verifyToastNotificationShow(message);
        await this.mouseMoveCenter();
    }
    
    async windowByIndex(index) {
        await this.app.client.windowByIndex(index);
    }

    async getWindowCount() {
        return await this.app.client.getWindowCount();
    }

    async getWindowIndexFromTitle(windowTitle) {
        let winCount = await this.getWindowCount();
        if (winCount > 1) {
            for (let j = 1; j < winCount; j++) {
                await this.windowByIndex(j);

                //wait 120s for title loading
                let title = await this.app.browserWindow.getTitle();
                for (let i = 1; i <= 120; i++) {
                    if (title != "Symphony") {
                        break;
                    }
                    await Utils.sleep(1);
                    title = await this.app.browserWindow.getTitle();;
                }

                if (title === windowTitle) {
                    await this.windowByIndex(0);
                    return j;
                }
            }
        }
        await this.windowByIndex(0);
        return 0;
    }

    async bringToFront(windowTitle) {
        let index = await this.getWindowIndexFromTitle(windowTitle);
        await this.windowByIndex(index);
        await this.app.browserWindow.minimize();
        await this.app.browserWindow.restore();
    }
        
    async closeChrome()
    {
        Utils.killProcess("chromedriver.exe");
    }
    
    async getToastNotificationIndex(message) {
        for (let i = 0; i < 10; i++) {
            let winCount = await this.app.client.getWindowCount();
            if (winCount > 1) {
                for (let j = 1; j < winCount; j++) {
                    await this.app.client.windowByIndex(j);
                    if (await this.app.client.getText(ui.TOAST_MESSAGE_CONTENT) === message) {
                        return j;
                    }
                }
            }
            await Utils.sleep(1);
        }
        return 0;
    }

    async getToastNotificationPosition(message) {
        let index = await this.getToastNotificationIndex(message);
        await this.windowByIndex(index);
        let currentPosition = await this.getCurrentPosition();
        await this.windowByIndex(0);
        return currentPosition;
    }

    async getToastNotificationSize(message) {
        let index = await this.getToastNotificationIndex(message);
        await this.windowByIndex(index);
        let currentSize = await this.getCurrentSize();
        await this.windowByIndex(0);
        return currentSize;
    }

    async verifyToastNotificationPosition(message, expectedPosition) {
        let screen = await this.app.electron.screen.getPrimaryDisplay();
        let screenWidth = screen.size.width;
        let screenHeight = screen.size.height;
        let currentPosition = await this.getToastNotificationPosition(message);
        let curentSize = await this.getToastNotificationSize(message);
        switch (expectedPosition) {
            case "lower-right":
                expect(currentPosition[0] + curentSize[0]).toEqual(screenWidth);
                expect(screenHeight - (currentPosition[1] + curentSize[1])).toBeLessThan(100);
                break;
            case "upper-right":
                expect(currentPosition[0] + curentSize[0]).toEqual(screenWidth);
                expect(currentPosition[1]).toEqual(0);
                break;
            case "upper-left":
                expect(currentPosition[0]).toEqual(0);
                expect(currentPosition[1]).toEqual(0);
                break;
            case "lower-left":
                expect(currentPosition[0]).toEqual(0);
                expect(screenHeight - (currentPosition[1] + curentSize[1])).toBeLessThan(100);
                break;
        }   
        await this.windowByIndex(0);
        return 0;
    }    

    async getWindowCount() {
        return await this.app.client.getWindowCount();
    }   

    async verifyWindowFocus(windowTitle) {
        let index = await this.getWindowIndexFromTitle(windowTitle);
        await this.windowByIndex(index);
        expect(await this.app.browserWindow.isFocused()).toBeTruthy();
        await this.windowByIndex(0);
    }

    async verifyPopOutWindowAppear(windowTitle) {
        let index = await this.getWindowIndexFromTitle(windowTitle);
        expect(index).toBeGreaterThan(0);
    }

    async closeAllPopOutWindow() {
        let winCount = await this.getWindowCount();
        while (winCount > 1) {
            await this.windowByIndex(winCount - 1);
            await this.app.browserWindow.close();
            await Utils.sleep(2);
            winCount = await this.getWindowCount();
        }
        await this.windowByIndex(0);
    }
}

module.exports = WindowsActions;
