import test from 'ava';
import * as robot from 'robotjs';
import { Application } from 'spectron';
import { robotActions } from './fixtures/robot-actions';

import { sleep, startApplication, stopApplication } from './fixtures/spectron-setup';

let app;

test.before(async (t) => {
    app = await startApplication() as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('about-app: verify application minimize / maximize feature', async (t) => {
    robotActions.clickAppMenu();
    robot.keyTap('down');
    robot.keyTap('enter');

    // wait for about window to load
    await sleep(500);
    await app.client.windowByIndex(1);
    t.truthy(await app.browserWindow.getTitle(), 'About Symphony');
});

test('about-app: verify copy button with few data validation', async (t) => {
    await app.client.click('.AboutApp-copy-button');
    const clipboard = JSON.parse(await app.client.electron.remote.clipboard.readText());

    t.log(clipboard);
    t.true(clipboard.hasOwnProperty('appName'));
    t.true(clipboard.hasOwnProperty('clientVersion'));
    t.true(clipboard.hasOwnProperty('sfeVersion'));
    t.true(clipboard.hasOwnProperty('sdaVersion'));
    t.true(clipboard.hasOwnProperty('sdaBuildNumber'));
    robotActions.closeWindow();
});
