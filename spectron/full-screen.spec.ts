import test from 'ava';
import * as robot from 'robotjs';
import { Application } from 'spectron';
import { robotActions } from './fixtures/robot-actions';

import { getDemoFilePath, sleep, startApplication, stopApplication } from './fixtures/spectron-setup';

let app;

test.before(async (t) => {
    app = await startApplication() as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('fullscreen: verify application full screen feature', async (t) => {
    await app.browserWindow.loadURL(getDemoFilePath());
    await app.client.waitUntilWindowLoaded(5000);
    robotActions.toggleFullscreen();
    t.true(await app.browserWindow.isFullScreen());

    await sleep(500);
    robot.keyTap('escape');
    t.false(await app.browserWindow.isFullScreen());
});
