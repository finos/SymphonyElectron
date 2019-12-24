import test from 'ava';
import { Application } from 'spectron';

import { getDemoFilePath, sleep, startApplication, stopApplication, Timeouts } from './fixtures/spectron-setup';

let app;

test.before(async (t) => {
    app = await startApplication(true) as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('Verify is the application is running', async (t) => {
    t.true(app.isRunning());
});

test('Verify notification window is created', async (t) => {
    await app.browserWindow.loadURL(getDemoFilePath());
    await app.client.waitUntilWindowLoaded(Timeouts.fiveSec);
    await app.client.click('#notf');

    await sleep(Timeouts.oneSec);
    t.timeout(10000);
    t.is(await app.client.getWindowCount(), 2);
    await app.client.windowByIndex(1);
    await app.client.click('.close');

    await sleep(2000);
    await app.client.windowByIndex(0);
});

test('Verify notification window is hidden', async (t) => {
    await app.client.click('#notf');

    await sleep(Timeouts.oneSec);
    t.timeout(Timeouts.fiveSec);
    await app.client.windowByIndex(1);
    await app.client.click('.close');

    await sleep(2000);
    await app.client.windowByIndex(0);
    t.is(await app.client.getWindowCount(), 2);
});
