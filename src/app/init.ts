import { app } from 'electron';
import * as path from 'path';
import * as shellPath from 'shell-path';

import { isDevEnv, isMac } from '../common/env';
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

// Setting the env path child_process issue https://github.com/electron/electron/issues/7688
(async () => {
    try {
        const paths = await shellPath();
        if (paths) {
            return process.env.PATH = paths;
        }
        if (isMac) {
            process.env.PATH = [
                './node_modules/.bin',
                '/usr/local/bin',
                process.env.PATH,
            ].join(':');
        }
    } catch (e) {
        if (isMac) {
            process.env.PATH = [
                './node_modules/.bin',
                '/usr/local/bin',
                process.env.PATH,
            ].join(':');
        }
    }
})();

// tslint:disable-next-line
require('./main');
