const ui = require('./spectronInterfaces.js');
const constants = require('./spectronConstants.js');
const Utils = require('./spectronUtils');
const WindowsActions = require('./spectronWindowsActions');
const robot = require('robotjs');
const { isMac, isWindowsOS } = require('../../js/utils/misc');

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
        await this.app.client.waitForVisible(ui.MINIMIZE_BTN, constants.TIMEOUT_WAIT_ELEMENT).click(ui.MINIMIZE_BTN);
    }

    async minimizeWindows() {
        await this.app.browserWindow.minimize();
        await this.app.browserWindow.isMinimized().then(function (isMinimized) {
            expect(isMinimized).toBeTruthy();
        });
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
        let obj = await this.getElementByXPath(el);
        if (obj != null)
            await this.app.client.setValue(el, data);
    }

    async getText(element) {
        return await this.app.client.getText(element);
    }

    async getValue(element) {
        return await this.app.client.getValue(element);
    }

    async getLocation(element) {
        return await this.app.client.getLocation(element);
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

    async clickIfElementVisible(selector, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        await this.app.client.waitForVisible(selector, timeOut)
            .click(selector)
    }

    async rightClickIfElementVisible(selector, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        await this.app.client.waitForVisible(selector, timeOut)
            .rightClick(selector, 10, 10)
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
                        break;
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

    async verifyNoToastNotificationShow() {
        let noShow = false;
        let title = '';        
        for (let i = 0; i < 5; i++) {
            await Utils.sleep(1); 
            await this.app.client.windowByIndex(1);
            title = await this.app.client.getText(ui.TOAST_MESSAGE_CONTENT)
            if (title !== '')
            {
                noShow = true;
                break;
            }
        }
        for (let j = 0; j < 15; j++) {
            await Utils.sleep(1); 
        }        
        if (title !== '')
        {
            noShow = true;
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
        await this.clickIfElementVisible(ui.SIGN_IN_BUTTON);
        await this.clickAndWaitElementVisible(ui.SIGN_IN_BUTTON, ui.SETTTING_BUTTON, constants.TIMEOUT_PAGE_LOAD);
        //await this.waitElementNotVisible(ui.SPINNER);
    }

    async persistToastIM(isPersistance) {
        await this.clickAndWaitElementVisible(ui.SETTTING_BUTTON, ui.ALERT_OPTION, constants.TIMEOUT_WAIT_ELEMENT);
        await this.clickAndWaitElementVisible(ui.ALERT_OPTION, ui.ALERT_TAB, constants.TIMEOUT_WAIT_ELEMENT);
        let ischeck = await this.app.client.element(ui.PERSIS_NOTIFICATION_INPUT_IM).getAttribute("checked");

        if (isPersistance === true && (ischeck === false || ischeck === null)) {
            await this.clickAndWaitElementVisible(ui.PERSIS_NOTIFICATION_INPUT_IM, ui.PERSIS_NOTIFICATION_INPUT_IM, constants.TIMEOUT_WAIT_ELEMENT);
        }
        else if (isPersistance === false) {
            await this.scrollAndClick(ui.SCROLL_TAB_ACTIVE, ui.PERSIS_NOTIFICATION_INPUT_IM);
         
        }
    }

    async openACP() {
        await this.clickAndWaitElementVisible(ui.SETTTING_BUTTON, ui.GENERAL_OPTION, constants.TIMEOUT_WAIT_ELEMENT);
        await this.clickAndWaitElementVisible(ui.GENERAL_OPTION, ui.GENERAL_TAB, constants.TIMEOUT_WAIT_ELEMENT);
        await this.clickAndWaitElementVisible(ui.ACP_LINK, ui.IMG_ADMIN_LOGO, constants.TIMEOUT_WAIT_ELEMENT * 10);

    }

    async clickPlusButton() {
        await this.clickIfElementVisible(ui.PLUS_BTN);
    }

    async clickStartChat() {
        await this.clickIfElementVisible(ui.START_CHAT, constants.TIMEOUT_WAIT_ELEMENT * 5);
    }

    async logout() {
        await this.clickAndWaitElementVisible(ui.ADMIN_NAME, ui.ADMIN_LOG_OUT, constants.TIMEOUT_WAIT_ELEMENT);
        await this.clickAndWaitElementVisible(ui.ADMIN_LOG_OUT, ui.SIGN_IN_BUTTON, constants.TIMEOUT_WAIT_ELEMENT);
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
        await this.waitElementVisible(ui.HEADER_MODULE, constants.TIMEOUT_WAIT_ELEMENT * 5);
    }

    async waitElementNotVisible(locator, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        return await this.app.client.waitForVisible(locator, timeOut, true);
    }

    async waitElementVisible(locator, timeOut = constants.TIMEOUT_WAIT_ELEMENT) {
        return await this.app.client.waitForVisible(locator, timeOut);
    }

    async mouseOver(locator) {
        await this.waitElementVisible(locator);
        await this.app.client.moveToObject(locator);
    }

    async createIM(username) {
        await this.clickPlusButton();
        await this.clickStartChat();
        await this.selectIMTab();
        await this.addParticipant(username);
        await this.clickDoneButton();
        await this.verifyChatModuleVisible(username)
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

    async clickPopInIcon(windowTitle) {
        let windowsActions = await new WindowsActions(this.app);
        let index = await windowsActions.getWindowIndexFromTitle(windowTitle);
        await windowsActions.windowByIndex(index);
        await this.mouseOver(ui.PIN_CHAT_MOD);
        await Utils.sleep(2); //wait popin button clickable
        await this.clickIfElementVisible(ui.POPIN_BUTTON);
        await windowsActions.windowByIndex(0);
        await this.waitElementVisible(ui.HEADER_MODULE);
    }

    async clickInboxPopOutIcon() {
        let windowsActions = await new WindowsActions(this.app);
        await this.clickIfElementVisible(ui.POPOUT_INBOX_BUTTON);
        let index = await windowsActions.getWindowCount() - 1;
        await windowsActions.windowByIndex(index);
        await this.waitElementNotVisible(ui.SPINNER, constants.TIMEOUT_PAGE_LOAD);
    }

    async verifyPopInIconDisplay(windowTitle) {
        let windowsActions = await new WindowsActions(this.app);
        let index = await windowsActions.getWindowIndexFromTitle(windowTitle);
        await windowsActions.windowByIndex(index);
        await this.waitElementVisible(ui.POPIN_BUTTON, constants.TIMEOUT_WAIT_ELEMENT);
        await windowsActions.windowByIndex(0);
    }

    async verifyPopOutIconDisplay() {
        await this.mouseOver(ui.PIN_CHAT_MOD);
        await Utils.sleep(2); //wait popout button clickable
        await this.waitElementVisible(ui.POPOUT_BUTTON, constants.TIMEOUT_WAIT_ELEMENT * 5);
    }

    async clickInboxIcon() {
        await this.clickIfElementVisible(ui.INBOX_BUTTON);
    }

    async clickLeftNavItem(item) {
        let singleItemLocator = ui.LEFT_NAV_SINGLE_ITEM.replace("$$", item);
        await this.clickIfElementVisible(singleItemLocator);
    }

    async logout() {
        await this.openAlertsSettings();
        await this.clickAndWaitElementVisible(ui.SIGNOUT, ui.SIGNOUT_MODAL_BUTTON);
        await this.clickAndWaitElementVisible(ui.SIGNOUT_MODAL_BUTTON, ui.SIGN_IN_BUTTON, constants.TIMEOUT_PAGE_LOAD);
    }

    async verifyElementExist(findElement) {
        let obs = await this.app.client.elements(findElement);
        let len = await obs.value.length;
        await expect(len).toBe(1);
    }

    async logintoAdmin(user) {
        await this.inputText(ui.SIGN_IN_EMAIL, user.username);
        await this.inputText(ui.SIGN_IN_PASSWORD, user.password);
        await this.clickAndWaitElementVisible(ui.SIGN_IN_BUTTON, ui.IMG_ADMIN_LOGO, constants.TIMEOUT_WAIT_ELEMENT * 5);

    }

    async openNotificationPosition() {
        await this.clickIfElementVisible(ui.ALERT_POSITION);
    }

    async adjustNotificationPosition(position) {
        await this.openNotificationPosition();
        let windowsActions = await new WindowsActions(this.app);
        let winCount = await windowsActions.getWindowCount();
        await windowsActions.windowByIndex(winCount - 1);
        await this.clickIfElementVisible("#" + position);
        await this.clickIfElementVisible("#ok-button");
        await windowsActions.windowByIndex(0);
    }

    async checkBox(selector, value) {
        var checked = await this.app.client.isSelected(selector);
        while (checked != value) {
            await this.clickIfElementVisible(selector);
            checked = await this.app.client.isSelected(selector);
        }
    }

    async pinChat() {
        await this.mouseOver(ui.PIN_CHAT_MOD);
        await Utils.sleep(2); //wait popout button clickable
        await this.clickIfElementVisible(ui.PIN_CHAT_MOD);
        await this.waitElementVisible(ui.PINNED_CHAT_MOD);
    }

    async verifyChatModuleVisible(muduleName) {
        let locator = ui.HEADER_MODULE_NAME.replace("$$", muduleName);
        await this.waitElementVisible(locator, constants.TIMEOUT_WAIT_ELEMENT * 5);
    }

    async closeAllGridModules() {
        let count = await this.getCount(ui.HEADER_MODULE);
        for (let i = 1; i <= count; i++) {
            let header = ui.HEADER_MODULES.replace("$$", 1);
            let closeButton = ui.CLOSE_MODULES.replace("$$", 1);
            await this.mouseOver(header);
            await this.clickIfElementVisible(ui.PIN_CHAT_MOD);
            await this.clickIfElementVisible(closeButton);
        }
    }

    async getCount(locator) {
        let elements = await this.app.client.elements(locator);
        return elements.value.length;
    }
    
    async navigateURL(url) {
        return this.app.client.url(url)
    }

    async verifySpellCheckerWorking(locator, previous) {
        let current = await this.getValue(locator);
        await expect(current !== previous).toBeTruthy();
    }

    async openContextMenu(locator) {
        if (isWindowsOS) {
            let position = await this.getLocation(locator);
            await robot.setMouseDelay(500);
            await robot.moveMouse(position.x + 20, position.y + 5);
            await robot.mouseToggle("down", "right");
            await robot.mouseToggle("up", "right");
        } else {
            await this.mouseOver(locator);
            //right click twice to make it work on MAC
            await this.rightClickIfElementVisible(locator);
            await this.rightClickIfElementVisible(locator);
        }
    }

    async selectItemOnContextMenu(number) {
        await robot.setKeyboardDelay(1000);
        for (let i = 1; i <= number; i++) {
            await robot.keyTap('down');
        }
        await robot.keyTap('enter');
    }
}

module.exports = WebActions;
