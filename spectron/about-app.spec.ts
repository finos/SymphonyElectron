import test from 'ava';
import * as robot from 'robotjs';
import { Application } from 'spectron';
import { robotActions } from './fixtures/robot-actions';
import {
  loadURL,
  podUrl,
  sleep,
  startApplication,
  stopApplication,
  Timeouts,
} from './fixtures/spectron-setup';

let app;

test.before(async (t) => {
  app = (await startApplication()) as Application;
  t.true(app.isRunning());

  await loadURL(app, podUrl);
  await app.client.waitUntilWindowLoaded(Timeouts.fiveSec);

  await sleep(Timeouts.fiveSec);
});

test.after.always(async () => {
  await stopApplication(app);
});

test('about-app: verify about application feature', async (t) => {
  robotActions.clickAppMenu();
  robot.keyTap('down');
  robot.keyTap('enter');

  // wait for about window to load
  await sleep(Timeouts.halfSec);
  await app.client.windowByIndex(1);
  await app.client.waitUntilWindowLoaded(Timeouts.fiveSec);
  t.truthy(await app.browserWindow.getTitle(), 'About Symphony');
});

test('about-app: verify copy button with few data validation', async (t) => {
  await sleep(Timeouts.oneSec);
  await app.client.click('.AboutApp-copy-button');
  const clipboard = JSON.parse(
    await app.client.electron.remote.clipboard.readText(),
  );

  t.log(clipboard);
  t.true(clipboard.hasOwnProperty('appName'));
  t.true(clipboard.hasOwnProperty('clientVersion'));
  t.true(clipboard.hasOwnProperty('sfeVersion'));
  t.true(clipboard.hasOwnProperty('sfeClientType'));
  t.true(clipboard.hasOwnProperty('sdaVersion'));
  t.true(clipboard.hasOwnProperty('sdaBuildNumber'));
  robotActions.closeWindow();
});

test('about-app: verify close button will close modal', async (t) => {
  await sleep(Timeouts.oneSec);
  await app.client.click('[data-testid="CLOSE_BUTTON"]');

  t.false(app.client.$('[data-testid="CLOSE_BUTTON"]'));
  robotActions.closeWindow();
});
