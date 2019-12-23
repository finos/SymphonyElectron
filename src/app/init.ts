import { app } from 'electron';
import * as path from 'path';

import { isDevEnv, isNodeEnv } from '../common/env';
import { logger } from '../common/logger';
import { getCommandLineArgs } from '../common/utils';
import { appStats } from './stats';

// Handle custom user data path from process.argv
const userDataPathArg: string | null = getCommandLineArgs(process.argv, '--userDataPath=', false);
const userDataPath = userDataPathArg && userDataPathArg.substring(userDataPathArg.indexOf('=') + 1);

// force sandbox: true for all BrowserWindow instances.
if (!isNodeEnv) {
    app.enableSandbox();
}

// need to set this explicitly if using Squirrel
// https://www.electron.build/configuration/configuration#Configuration-squirrelWindows
app.setAppUserModelId('com.symphony.electron-desktop');

// Set user data path before app ready event
if (isDevEnv) {
    const devDataPath = path.join(app.getPath('appData'), 'Symphony-dev');
    logger.info(`init: Setting user data path to`, devDataPath);
    app.setPath('userData', devDataPath);
}

if (userDataPath) {
    logger.info(`init: Setting user data path to`, userDataPath);
    app.setPath('userData', userDataPath);
}

logger.info(`init: Fetch user data path`, app.getPath('userData'));

// Log app statistics
appStats.logStats();

// tslint:disable-next-line
require('./main');
