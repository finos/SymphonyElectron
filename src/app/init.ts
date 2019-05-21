import { app } from 'electron';
import * as path from 'path';

import { isDevEnv } from '../common/env';
import { getCommandLineArgs } from '../common/utils';

// Handle custom user data path from process.argv
const userDataPathArg: string | null = getCommandLineArgs(process.argv, '--userDataPath=', false);
const userDataPath = userDataPathArg && userDataPathArg.substring(userDataPathArg.indexOf('=') + 1);

// Set user data path before app ready event
if (isDevEnv) {
    const appDataPath = app.getPath('appData');
    app.setPath('userData', path.join(appDataPath, 'Symphony-dev'));
}

if (userDataPath) {
    app.setPath('userData', userDataPath);
}

// tslint:disable-next-line
require('./main');
