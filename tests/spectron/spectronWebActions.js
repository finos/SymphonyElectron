const ui = require('./spectronInterfaces.js');
const constants = require('./spectronConstants.js');
const Utils = require('./spectronUtils');
const WindowsActions = require('./spectronWindowsActions');

class WebActions {
    constructor(app) {
        this.app = app;
    }

    async maximizeButtonByClick() {
        await this.app.client.waitForVisible(ui.MAXIMIZE_BTN, constants.TIMEOUT_WAIT_ELEMENT).click(ui.MAXIMIZE_BTN);
    }

    async maximizeWindows() {
        await this.maximizeButtonByClick();
        await this.app.browserWindow.isMaximized().then(function (maximized) {
            expect(maximized).toBeTruthy();
        })
    }

    async clickMinimizeButton() {
        await this.app.client.waitForVisible(ui.MINIMIZE_BTN, 10000).click(ui.MINIMIZE_BTN);
    }

    async minimizeWindows() {
        await this.clickMinimizeButton();
        await this.app.browserWindow.isMinimized().then(function (isMinimized) {
            expect(isMinimized).toBeTruthy();
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

    async getElementByXPath(xpath) {
        await this.app.client.waitForVisible(xpath, constants.TIMEOUT_WAIT_ELEMENT);
        var elem = this.app.client.element(xpath);
        if (elem.isVisible()) {
            return elem;
        }
        return null;
    }
    async inputText(el, data) {
        var obj = await this.getElementByXPath(el);
        if (obj != null)
            await this.app.client.setValue(el, data);
    }
    async clickAndWaitElementVisible(xpath, elementToVisible, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        await this.app.client.click(xpath).then(async () => {
            await this.app.client.waitForVisible(elementToVisible, timeOut);
        });
    }

    async scrollAndClick(selector, findElement) {
        var i = 0;
        var y = 0;
        await this.app.client.scroll(selector, 0, y);
        var size = 0;
        while (i < 10) {
            size = this.app.client.getElementSize(findElement);
            if (findElement != null && size == 0) {
                y += 50;
                await this.app.client.scroll(selector, 0, y);
            }
            else {
                await this.app.client.click(findElement);
                return;
            }
            i++;
        }
        return;
    }

    async promiseTimeout(ms, promiseFunc) {
        return new Promise(function (resolve, reject) {
            // create a timeout to reject promise if not resolved
            var timer = setTimeout(function () {
                reject(new Error("promise timeout"));
            }, ms);
            promiseFunc
                .then(function (res) {
                    clearTimeout(timer);
                    resolve(res);
                })
                .catch(function (err) {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    };

    async clickIfElementVisible(selector, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        await this.app.client.waitForVisible(selector, timeOut)
            .click(selector)
    }

    async openAlertsSettings() {
        await this.clickAndWaitElementVisible(ui.SETTTING_BUTTON, ui.ALERT_OPTION);
        await this.clickAndWaitElementVisible(ui.ALERT_OPTION, ui.ALERT_TAB);
    }

    async verifyToastNotificationShow(message) {
        let show = false;
        for (let i = 0; i < 10; i++) {
            let winCount = await this.app.client.getWindowCount();
            if (winCount > 1) {
                for (let j = 1; j < winCount; j++) {
                    await this.app.client.windowByIndex(j);
                    if (await this.app.client.getText(ui.TOAST_MESSAGE_CONTENT) === message) {
                        show = true;
                    }
                }
                if (show) {
                    break;
                }
            }
            await Utils.sleep(1);
        }
        await expect(show).toBeTruthy();
        await this.app.client.windowByIndex(0);
    }

    async verifyNoToastNotificationShow(message) {
        let noShow;
        for (let i = 0; i < 10; i++) {
            let winCount = await this.app.client.getWindowCount();
            if (winCount > 1) {
                for (let j = 1; j < winCount; j++) {
                    await this.app.client.windowByIndex(j);
                    if (await this.app.client.getText(ui.TOAST_MESSAGE_CONTENT) !== message) {
                        noShow = true;
                    }
                    else {
                        noShow = false;
                    }
                }
                if (noShow === false) {
                    break;
                }
            }
            await Utils.sleep(1);
        }
        await expect(noShow).toBeTruthy();
        await this.app.client.windowByIndex(0);
    }

    async getElementByXPath(xpath) {
        let elem = this.app.client.element(xpath);
        if (elem.isVisible()) {
            return elem;
        }
        return null;
    }

    async inputText(el, data) {
        let obj = await this.getElementByXPath(el);
        if (obj != null)
            await this.app.client.setValue(el, data);
    }

    async clickAndWaitElementVisible(xpath, elementToVisible, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        await this.app.client.click(xpath);
        await this.app.client.waitForVisible(elementToVisible, timeOut);
    }

    async clickIfElementVisible(xpath, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        await this.app.client.waitForVisible(xpath, timeOut)
            .click(xpath)
    }

    async login(user) {
        await this.inputText(ui.SIGN_IN_EMAIL, user.username);
        await this.inputText(ui.SIGN_IN_PASSWORD, user.password);
        await this.clickAndWaitElementVisible(ui.SIGN_IN_BUTTON, ui.SETTTING_BUTTON, constants.TIMEOUT_PAGE_LOAD);
        await this.waitElementNotVisible(ui.SPINNER);
    }

    async persistToastIM() {
        await this.clickAndWaitElementVisible(ui.SETTTING_BUTTON, ui.ALERT_OPTION);
        await this.clickAndWaitElementVisible(ui.ALERT_OPTION, ui.ALERT_TAB);
        await this.clickAndWaitElementVisible(ui.PERSIS_NOTIFICATION_INPUT_IM, ui.PERSIS_NOTIFICATION_INPUT_IM);
    }

    async clickPlusButton() {
        await this.clickIfElementVisible(ui.PLUS_BTN);
    }

    async clickStartChat() {
        await this.clickIfElementVisible(ui.START_CHAT);
    }

    async selectIMTab() {
        await this.clickIfElementVisible(ui.IM_TAB);
    }

    async addParticipant(username) {
        await this.inputText(ui.ADD_PARTICIPANT_TEXT, username);
        await this.clickIfElementVisible(ui.USERS_SUGGESTION_LIST, 20000);
    }

    async clickDoneButton() {
        await this.clickIfElementVisible(ui.CREATE_IM_DONE_BTN);
        await this.waitElementVisible(ui.HEADER_MODULE);
    }

    async waitElementNotVisible(locator, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        return await this.app.client.waitForVisible(locator, timeOut, true);
    }

    async waitElementVisible(locator, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        return await this.app.client.waitForVisible(locator, timeOut);
    }

    async mouseOver(locator) {
        await this.app.client.moveToObject(locator);
    }

    async createIM(username) {
        await this.clickPlusButton();
        await this.clickStartChat();
        await this.selectIMTab();
        await this.addParticipant(username);
        await this.clickDoneButton();
    }

    async clickPopOutIcon() {
        let windowsActions = await new WindowsActions(this.app);
        await this.mouseOver(ui.PIN_CHAT_MOD);
        await Utils.sleep(2); //wait popout button clickable
        await this.clickIfElementVisible(ui.POPOUT_BUTTON);
        let index = await windowsActions.getWindowCount() - 1;
        await windowsActions.windowByIndex(index);
        await this.waitElementNotVisible(ui.SPINNER, constants.TIMEOUT_PAGE_LOAD);
    }

    async clickInboxPopOutIcon() {
        let windowsActions = await new WindowsActions(this.app);
        await this.clickIfElementVisible(ui.POPOUT_INBOX_BUTTON);
        let index = await windowsActions.getWindowCount() - 1;
        await windowsActions.windowByIndex(index);
        await this.waitElementNotVisible(ui.SPINNER, constants.TIMEOUT_PAGE_LOAD);
    }

    async verifyPopInIconDisplay(windowTitle){
        let windowsActions = await new WindowsActions(this.app);
        let index = await windowsActions.getWindowIndexFromTitle(windowTitle);
        await windowsActions.windowByIndex(index);
        await this.waitElementVisible(ui.POPIN_BUTTON, constants.TIMEOUT_WAIT_ELEMENT);
        await windowsActions.windowByIndex(0);
    }

    async clickInboxIcon() {
        await this.clickIfElementVisible(ui.INBOX_BUTTON);
    }

    async clickLeftNavItem(item){
        let singleItemLocator = ui.LEFT_NAV_SINGLE_ITEM.replace("$$",item);  
        await this.clickIfElementVisible(singleItemLocator);
    }

    async logout(){
        await this.openAlertsSettings();
        await this.clickAndWaitElementVisible(ui.SIGNOUT, ui.SIGNOUT_MODAL_BUTTON);
        await this.clickAndWaitElementVisible(ui.SIGNOUT_MODAL_BUTTON, ui.SIGN_IN_BUTTON, constants.TIMEOUT_PAGE_LOAD);
    }
 


}

module.exports = WebActions;
