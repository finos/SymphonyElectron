const { Builder, By, Key, until, Actions } = require('selenium-webdriver')
require('selenium-webdriver/chrome');
require('chromedriver');
const Utils = require('./spectronUtils');
var assert = require('assert');
const ui = require('./spectronInterfaces.js');
const specconst = require('./spectronConstants.js');
let TIMEOUT_WAIT_ELEMENT = parseInt(specconst.TIMEOUT_WAIT_ELEMENT, 10);
let TIMEOUT_PAGE_LOAD = parseInt(specconst.TIMEOUT_PAGE_LOAD, 10);

class WebDriver {
    constructor(options) {
        this.options = options;
        this.d = new Builder().forBrowser(options.browser).build();
        this.initDriver();
    }

    async waitElelmentIsNotVisible(xpath) {
        let result = false;
        try {
            const el = await this.driver.wait(
                until.elementLocated(By.xpath(xpath)),
                TIMEOUT_WAIT_ELEMENT
            )
            await this.driver.wait(until.elementIsNotVisible(el), TIMEOUT_WAIT_ELEMENT);
            if (this.driver.findElements(By.xpath(xpath)).length > 0) {
                result = true;
            }
            else {
                result = false;
            }
            return await assert.equal(result, false);
        }
        catch (err) {
            await assert.equal(result, false);
        }
    }

    async waitElelmentIsVisible(xpath, timeout) {
        const el = await this.driver.wait(
            until.elementLocated(By.xpath(xpath)),
            timeout
        )
        await this.driver.wait(until.elementIsVisible(el), timeout);
    }

    async  waitElementVisibleAndGet(xpath) {
        const el = await this.driver.wait(
            until.elementLocated(By.xpath(xpath)),
            TIMEOUT_WAIT_ELEMENT
        )
        return await this.driver.wait(until.elementIsVisible(el), TIMEOUT_WAIT_ELEMENT)
    }

    async getElementById(id) {
        const el = await this.driver.wait(until.elementLocated(By.id(id)), TIMEOUT_WAIT_ELEMENT)
        return await this.driver.wait(until.elementIsVisible(el), TIMEOUT_WAIT_ELEMENT)
    }

    async getElementByXPath(xpath) {
        const el = await this.driver.wait(
            until.elementLocated(By.xpath(xpath)),
            TIMEOUT_WAIT_ELEMENT
        )
        return await this.driver.wait(until.elementIsVisible(el), TIMEOUT_WAIT_ELEMENT)
    }

    async inputText(el, data) {
        var obj = await this.getElementByXPath(el);
        await obj.sendKeys(data);
    }

    async sendEnter(el) {
        var obj = await this.getElementByXPath(el);
        await obj.sendKeys(Key.ENTER);
    }

    async sendMessage(message) {
        await this.inputText(ui.CHAT_INPUT_TYPING, message);
        await this.sendEnter(ui.CHAT_INPUT_TYPING);
    }

    async sendMessages(messages) {
        for (var i = 0; i < messages.length; i++) {
            await this.sendMessage(messages[i]);
            await this.sleep(1);
        }
    }

    async login(user) {
        await this.inputText(ui.SIGN_IN_EMAIL, user.username);
        await this.inputText(ui.SIGN_IN_PASSWORD, user.password);
        var singin = await this.getElementByXPath(ui.SIGN_IN_BUTTON);
        await singin.click();
        await this.waitElelmentIsVisible(ui.SETTTING_BUTTON, TIMEOUT_PAGE_LOAD);
    }

    async mentionUserOnChat(user) {
        await this.inputText(ui.CHAT_INPUT_TYPING, "@" + user.name);
        var suggestion = ui.MENTION_USER_SUGGESTION.replace("$$", user.name);
        var el = await this.getElementByXPath(suggestion);
        await el.click();
        await this.sendEnter(ui.CHAT_INPUT_TYPING);
    }

    async waitSuggestionShowOnlyOneItem(xpath) {
        if (this.driver.findElements(By.xpath(xpath)).length == 1) {
            return result = true;
        }
        return false;
    }

    async clickShowConversationCreationModal() {
        var plusButton = await this.getElementByXPath(ui.PLUS_BTN);
        await plusButton.click();
    }

    async selectIMTab() {
        var imTab = await this.getElementByXPath(ui.IM_TAB);
        await imTab.click();
    }

    async selectRoomTab() {
        var roomTab = await this.getElementByXPath(ui.CHATROOM_TAB);
        await roomTab.click();
    }

    async addParticipant(username) {
        await this.inputText(ui.ADD_PARTICIPANT_TEXT, username);
        await this.sleep(5);
        var el = await this.waitElementVisibleAndGet(ui.USERS_SUGGESTION_LIST);
        await el.click();
    }

    async clickDoneButton() {
        var el = await this.getElementByXPath(ui.CREATE_IM_DONE_BTN);
        await el.click();
        await this.waitElelmentIsNotVisible(ui.CREATE_IM_DONE_BTN);
    }

    async clickConfirmCreateRoom() {
        var el = await this.getElementByXPath(ui.CONFIRM_CREATE_ROOM_BUTTON);
        await el.click();
        await this.waitElelmentIsNotVisible(ui.CONFIRM_CREATE_ROOM_BUTTON);
    }

    async clickStartChat() {
        var el = await this.getElementByXPath(ui.START_CHAT);
        await el.click();
    }

    async createIM(username) {
        await this.clickShowConversationCreationModal();
        await this.clickStartChat();
        await this.selectIMTab();
        await this.addParticipant(username);
        await this.clickDoneButton();
    }

    async createMIM(usernames) {
        await this.clickShowConversationCreationModal();
        await this.clickStartChat();
        await this.selectIMTab();
        for (var i = 0; i < usernames.length; i++) {
            await this.addParticipant(usernames[i]);
        }
        await this.clickDoneButton();
    }

    async  clickCreateSignal() {
        var el = await this.getElementByXPath(ui.SIGNAL_OPTION);
        await el.click();
    }

    async selectPublicRadioButton() {
        var el = await this.waitElementVisibleAndGet(ui.PUBLIC_ROOM_RADIO_BTN);
        await el.click();
    }

    async selectPrivateRadioButton() {
        var el = await this.waitElementVisibleAndGet(ui.PRIVATE_ROOM_RADIO_BTN);
        await el.click();
    }

    async clickLeftNavItem(name) {
        var xpath = await ui.LEFT_NAV_SINGLE_ITEM.replace("$$", name);
        var el = await this.getElementByXPath(xpath);
        await el.click();
        var eheader = await this.getElementByXPath(ui.HEADER_MODULE);
        await this.driver.wait(until.elementIsVisible(eheader), TIMEOUT_WAIT_ELEMENT)
    }

    async createRoom(usernames, name, description, type) {
        await this.clickShowConversationCreationModal();
        await this.clickStartChat();
        await this.selectRoomTab();
        await this.inputText(ui.CHATROOM_NAME_TEXT, name);
        await this.inputText(ui.CHATROOM_DESCR_TEXT, description);
        if (type === specconst.TYPE_ROOM.private) {
            await this.selectPrivateRadioButton();
        }
        if (type === specconst.TYPE_ROOM.public) {
            await this.selectPublicRadioButton();
        }
        for (var i = 0; i < usernames.length; i++) {
            await this.addParticipant(usernames[i]);
        }
        await this.clickDoneButton();
        // await this.clickConfirmCreateRoom();
    }

    async createSignal(signalName, hashTag) {
        await this.clickShowConversationCreationModal();
        await this.clickCreateSignal();
        await this.inputText(ui.SIGNAL_NAME, signalName);
        await this.inputText(ui.LAST_RULE_ROW + ui.ENTER_KEYWORD_IN_LAST_INPUT, hashTag);
        await this.clickDoneButton();
    }

    async initDriver() {
        return this.d.then(_d => {
            this.driver = _d
        })
    }

    async startDriver() {
        await this.driver
            .manage()
            .window()
            .setPosition(0, 0);
        var size = await await this.driver
            .manage()
            .window().getSize();
        await this.driver.get(specconst.TESTED_HOST);
    }

    async focusCurrentBrowser() {
        this.driver.switchTo().window(this.driver.getAllWindowHandles()[0]);
    }

    async sleep(secondSleep) {
        await this.driver.sleep(secondSleep * 1000);
    }

    async timeOut(secondSleep) {
        return secondSleep * 1000;
    }

    async quit() {
        await this.driver.quit();
    }
    async close() {
        await this.driver.close();
    }

    async sendMessagesAndVerifyToast(messages) {
        for (var i = 0; i < messages.length; i++) {
            await this.webActions.clickPlusButton();
            await this.windowAction.pressCtrlM();
            await this.sendMessage(messages[i]).then(async () => {
                await this.windowAction.verifyPersistToastNotification(messages[i]);
            });
        }
    }
    async closeAllGridModules() {
        let count = await this.getCount(ui.HEADER_MODULE);
        for (let i = 1; i <= count; i++) {
            let header = ui.HEADER_MODULES.replace("$$", 1);
            let closeButton = ui.CLOSE_MODULES.replace("$$", 1);
            let pinButton = ui.PIN_CHAT_MODS.replace("$$", 1);
            await this.clickIfElementVisible(header);
            await this.clickIfElementVisible(pinButton);
            await this.clickIfElementVisible(closeButton);
        }
    }

    async clickIfElementVisible(selector) {
        let el = await this.getElementByXPath(selector);
        await el.click();
    }

    async getCount(locator) {
        let elements = await this.driver.findElements(By.xpath(locator));
        return elements.length;
    }

    async mouseOver(locator) {
        let el = await this.getElementByXPath(locator);
        let builder = await new Actions(this.driver);
        builder.moveToElement(el, 20, 20).click().build().perform();
    }
}
module.exports = WebDriver;
