import test from 'ava';
import * as robot from 'robotjs';

import { Application } from 'spectron';

import { getDemoFilePath, startApplication, stopApplication, Timeouts } from './fixtures/spectron-setup';

let app;

test.before(async (t) => {
    app = await startApplication() as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('spell-checker: verify application spell checking feature', async (t) => {
    robot.setKeyboardDelay(Timeouts.oneSec);
    const missSpelledWord = 'teest ';

    await app.browserWindow.loadURL(getDemoFilePath());
    await app.client.waitUntilWindowLoaded(Timeouts.fiveSec);
    await app.client.electron.remote.clipboard.writeText(missSpelledWord);
    await app.client.click('#tag');
    await app.client.webContents.paste();
    await app.client.waitForValue('#tag', Timeouts.fiveSec);

    t.is(await app.client.getValue('#tag'), missSpelledWord);

    await app.client.rightClick('#tag', 10, 10);
    robot.keyTap('down');
    robot.keyTap('enter');

    t.not(await app.client.getValue('#tag'), missSpelledWord);
});
