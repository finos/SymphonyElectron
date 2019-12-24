import test from 'ava';
import * as robot from 'robotjs';
import { Application } from 'spectron';

import {
    getDemoFilePath,
    sleep,
    startApplication,
    stopApplication,
    Timeouts,
} from './fixtures/spectron-setup';

let app;

export const openScreenPicker = async (window) => {
    if (!window) {
        throw new Error('openScreenPicker: must be called with Application');
    }
    await window.client.scroll(125, 1000);
    await sleep(Timeouts.halfSec);
    await window.client.click('#get-sources');
    await window.client.waitUntilWindowLoaded(Timeouts.fiveSec);
};

test.before(async (t) => {
    app = await startApplication() as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('screen-sharing-indicator: verify screen sharing indicator with frame is shown', async (t) => {
    await app.browserWindow.loadURL(getDemoFilePath());
    await app.client.waitUntilWindowLoaded(Timeouts.fiveSec);
    await openScreenPicker(app);
    robot.setKeyboardDelay(2000);

    await sleep(Timeouts.halfSec);
    t.is(await app.client.getWindowCount(), 2);
    await app.client.windowByIndex(1);
    // will select the entire screen option in the picker
    robot.keyTap('right');
    robot.keyTap('left');
    robot.keyTap('enter');

    await sleep(2000);
    t.is(await app.client.getWindowCount(), 3);
});

test('screen-sharing-indicator: verify screen sharing indicator title', async (t) => {
    // including the screen sharing frame
    await app.client.windowByIndex(2);
    await app.client.waitUntilWindowLoaded(Timeouts.fiveSec);

    const indicatorTitle = await app.browserWindow.getTitle();
    if (indicatorTitle !== 'Screen Sharing Indicator - Symphony') {
        await app.client.windowByIndex(1);
    }

    await app.client.click('.stop-sharing-button');
    await app.client.windowByIndex(0);
    await sleep(Timeouts.halfSec);
    // verify both frame and indicator are closed
    // when stop button is clicked
    t.is(await app.client.getWindowCount(), 1);
});
