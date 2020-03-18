import test from 'ava';
import { Application } from 'spectron';
import { robotActions } from './fixtures/robot-actions';

import { startApplication, stopApplication } from './fixtures/spectron-setup';

let app;

test.before(async (t) => {
    app = await startApplication() as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('minimize: verify application minimize / maximize feature', async (t) => {
    const win = app.browserWindow;
    win.minimize();
    t.true(await win.isMinimized());

    win.restore();
    t.true(await win.isVisible());
});

test('minimize: verify application to be minimized with keyboard accelerator', async (t) => {
    const win = app.browserWindow;
    robotActions.closeWindow();
    t.false(await win.isVisible());

    win.restore();
    t.true(await win.isVisible());
});
