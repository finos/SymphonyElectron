import { app, crashReporter, Menu, systemPreferences } from 'electron';
import * as path from 'path';

import { isDevEnv, isMac } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { readPlistFile } from './plist-handler';
import { appStats } from './stats';

// Handle custom user data path from process.argv
const userDataPathArg: string | null = getCommandLineArgs(
  process.argv,
  '--userDataPath=',
  false,
);
const userDataPath =
  userDataPathArg &&
  userDataPathArg.substring(userDataPathArg.indexOf('=') + 1);

if (isMac) {
  // Validate user config before starting the application
  readPlistFile();
}

// If we are running in production, sandbox the entire app
// and set the app user model id for windows native notifications
app.enableSandbox();

// need to set this explicitly if using Squirrel
// https://www.electron.build/configuration/configuration#Configuration-squirrelWindows
app.setAppUserModelId('com.symphony.electron-desktop');

// This will prevent loading default menu and performance of application startup
Menu.setApplicationMenu(null);

// Set user data path before app ready event
if (isDevEnv) {
  const devDataPath = path.join(app.getPath('appData'), 'Symphony-dev');
  // dev related config settings should be set here
  if (isMac) {
    systemPreferences.setUserDefault('contextIsolation', 'boolean', true);
    systemPreferences.setUserDefault(
      'installVariant',
      'string',
      '1234-5678-910',
    );
    systemPreferences.setUserDefault('devToolsEnabled', 'boolean', true);
  }
  logger.info(`init: Setting user data path to`, devDataPath);
  app.setPath('userData', devDataPath);
}

if (userDataPath) {
  logger.info(`init: Setting user data path to`, userDataPath);
  app.setPath('userData', userDataPath);
}

logger.info(`init: Fetch user data path`, app.getPath('userData'));

logger.info(`Crashes directory: ${app.getPath('crashDumps')}`);
crashReporter.start({
  submitURL: '',
  uploadToServer: false,
  ignoreSystemCrashHandler: false,
});
logger.info(`Crash Reporter started`);

// Log app statistics
appStats.logStats();

// tslint:disable-next-line
require('./main');
