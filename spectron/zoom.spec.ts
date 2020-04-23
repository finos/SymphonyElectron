import test from 'ava';
import { Application } from 'spectron';
import { robotActions } from './fixtures/robot-actions';

import {
    getDemoFilePath, loadURL,
    sleep,
    startApplication,
    stopApplication,
    Timeouts,
} from './fixtures/spectron-setup';

let app;

test.before(async (t) => {
    app = await startApplication() as Application;
    t.true(app.isRunning());
});

test.after.always(async () => {
    await stopApplication(app);
});

test('zoom: verify application zoom feature', async (t) => {
    await loadURL(app, getDemoFilePath());
    await app.client.waitUntilWindowLoaded(Timeouts.fiveSec);

    robotActions.zoomIn();
    t.is(await app.webContents.getZoomLevel(), 0.5);
    await sleep(Timeouts.oneSec);

    robotActions.zoomIn();
    t.is(await app.webContents.getZoomLevel(), 1);
    await sleep(Timeouts.oneSec);

    robotActions.zoomOut();
    t.is(await app.webContents.getZoomLevel(), 0.5);
    await sleep(Timeouts.oneSec);

    robotActions.zoomReset();
    t.is(await app.webContents.getZoomLevel(), 0);
});
