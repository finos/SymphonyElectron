import test from 'ava';
import * as robot from 'robotjs';
import { Application } from 'spectron';

import { getDemoFilePath, sleep, startApplication, stopApplication } from './fixtures/spectron-setup';

let app;

export const openScreenPicker = async (window) => {
    if (!window) {
        throw new Error('openScreenPicker: must be called with Application');
    }
    await window.client.scroll(125, 1000);
    await sleep(500);
    await window.client.click('#get-sources');
    await window.client.waitUntilWindowLoaded(5000);
};

test.before(async (t) => {
    app = await startApplication() as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('screen-picker: verify screen-picker close button', async (t) => {
    await app.browserWindow.loadURL(getDemoFilePath());
    await app.client.waitUntilWindowLoaded(5000);
    await openScreenPicker(app);

    await sleep(500);
    t.is(await app.client.getWindowCount(), 2);
    await app.client.windowByIndex(1);
    await app.client.click('.ScreenPicker-x-button');
    await sleep(500);
    t.is(await app.client.getWindowCount(), 1);
});

test('screen-picker: verify screen-picker escape keyboard actions', async (t) => {
    await app.client.windowByIndex(0);
    await openScreenPicker(app);

    await sleep(500);
    t.is(await app.client.getWindowCount(), 2);
    robot.keyTap('escape');
    await sleep(500);
    t.is(await app.client.getWindowCount(), 1);
});
