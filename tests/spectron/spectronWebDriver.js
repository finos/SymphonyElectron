const { Builder, By, Key, until } = require('selenium-webdriver')
require('selenium-webdriver/chrome');
require('chromedriver');
var assert = require('assert');
const ui = require('./spectronInterfaces.js');
const specconst = require('./spectronConstants.js');

const waitUntilTime = 20000;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 50
class WebDriver {
    constructor(options) {
        this.options = options;
        this.d = new Builder().forBrowser(options.browser).build();
        this.initDriver();

    }

    async  waitElelmentIsNotVisible(xpath) {
        let result = false;
        try {
            const el = await this.driver.wait(
                until.elementLocated(By.xpath(xpath)),
                waitUntilTime
            )
            await this.driver.wait(until.elementIsNotVisible(el), 10000);
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

    async  waitElementVisibleAndGet(xpath) {
        const el = await this.driver.wait(
            until.elementLocated(By.xpath(xpath)),
            waitUntilTime
        )
        return await this.driver.wait(until.elementIsVisible(el), waitUntilTime)
    }

    async  getElementById(id) {
        const el = await this.driver.wait(until.elementLocated(By.id(id)), waitUntilTime)
        return await this.driver.wait(until.elementIsVisible(el), waitUntilTime)
    }

    async  getElementByXPath(xpath) {
        const el = await this.driver.wait(
            until.elementLocated(By.xpath(xpath)),
            waitUntilTime
        )
        return await this.driver.wait(until.elementIsVisible(el), waitUntilTime)
    }

    async  inputText(el, data) {
        var obj = await this.getElementByXPath(el);
        await obj.sendKeys(data);
    }
    async  sendEnter(el) {
        var obj = await this.getElementByXPath(el);
        await obj.sendKeys(Key.ENTER);
    }
    async  sendMessage(message) {
        await this.inputText(ui.CHAT_INPUT_TYPING, message);
        await this.sendEnter(ui.CHAT_INPUT_TYPING, message);
    }

    async  sendMessages(messages) {
        for (var i = 0; i < messages.length; i++) {
            await this.sendMessage(messages[i]);
            await this.sleep(1);
        }
    }

    async  login(username) {
        await this.inputText(ui.SIGN_IN_EMAIL, username);
        await this.inputText(ui.SIGN_IN_PASSWORD, process.env.PASSWORD);
        var singin = await this.getElementByXPath(ui.SIGN_IN_BUTTON);
        await singin.click();       
        await this.waitElelmentIsVisible(ui.SETTTING_BUTTON,specconst.TIMEOUT_PAGE_LOAD);
    }
    async clickShowConversationCreationModal() {
        var plusButton = await this.getElementByXPath(ui.PLUS_BTN);
        await plusButton.click();
    }
    async selectIMTab() {
        var imTab = await this.getElementByXPath(ui.IM_TAB);
        await imTab.click();
    }
    async  selectRoomTab() {
        var roomTab = await this.getElementByXPath(ui.CHATROOM_TAB);
        await roomTab.click();
    }
    async  addParticipant(username) {
        await this.inputText(ui.ADD_PARTICIPANT_TEXT, username);
        await this.sleep(5);
        var el = await this.waitElementVisibleAndGet(ui.USERS_SUGGESTION_LIST);
        await el.click();
    }
    async  clickDoneButton() {
        var el = await this.getElementByXPath(ui.CREATE_IM_DONE_BTN);
        await el.click();
    }
    async  clickStartChat() {
        var el = await this.getElementByXPath(ui.START_CHAT);
        await el.click();
    }
    async  createIM(username) {
        await this.clickShowConversationCreationModal();
        await this.clickStartChat();
        await this.selectIMTab();
        await this.addParticipant(username);
        await this.clickDoneButton();
    }

    async  createMIM(usernames) {
        await this.clickShowConversationCreationModal();
        await this.clickStartChat();
        await this.selectIMTab();
        for (var i = 0; i < usernames.length; i++) {
            await this.addParticipant(usernames[i]);
        }
        await this.clickDoneButton();
    }
    async  selectPublicRadioButton() {
        var el = await this.waitElementVisibleAndGet(ui.PUBLIC_ROOM_RADIO_BTN);
        await el.click();
    }
    async  selectPrivateRadioButton() {
        var el = await this.waitElementVisibleAndGet(ui.PRIVATE_ROOM_RADIO_BTN);
        await el.click();
    }


    async  clickLeftNavItem(name) {
        xpath = ui.LEFT_NAV_SINGLE_ITEM.replace("$$", name);
        var el = await this.waitElementVisibleAndGet(xpath);
        await el.click();
    }
    async  createRoom(usernames, name, description, type) {
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
    }
    async  initDriver() {
        return this.d.then(_d => {
            this.driver = _d
        })
    }
    async  startDriver() {
        await this.driver
            .manage()
            .window()
            .setPosition(0, 0);
        var size = await await this.driver
            .manage()
            .window().getSize();
        await this.driver.get(process.env.TESTED_HOST);
    }
    async  focusCurrentBrowser() {
        this.driver.switchTo().window(this.driver.getAllWindowHandles()[0]);
    }
    async  quit() {
        await d.quit();
    }
    async sleep(secondSleep) {
        await this.driver.sleep(secondSleep * 1000);
    }
    async timeOut(secondSleep) {
        return secondSleep * 1000;
    }
    
    async  waitElelmentIsVisible(xpath,timeout) {       
        try {
            const el = await this.driver.wait(
                until.elementLocated(By.xpath(xpath)),
                waitUntilTime
            )
            await this.driver.wait(until.elementIsVisible(el), timeout);          
        }
        catch (err) {
           console.log("Error:"+err.messages);
        }
    }

    async quit() {
        await this.driver.quit();
    }
     async close() {
        await this.driver.close();
    }
}
module.exports = WebDriver;