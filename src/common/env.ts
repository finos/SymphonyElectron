import { app } from 'electron';
import { release } from 'os';

export const isWindowsOS = process.platform === 'win32';
const isWindows11OrHigher = () => {
  if (!isWindowsOS) {
    return false;
  }

  const buildNumber = parseInt(release().split('.')[2], 10);
  return buildNumber >= 22000;
};
export const isWindows11 = isWindows11OrHigher();

export const isDevEnv = !app?.isPackaged;
export const isElectronQA = !!process.env.ELECTRON_QA;

export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';
// Node's os.release() returns "25.0.0" on macOS Tahoe. we use the major component
export const isTahoe = isMac && parseInt(release().split('.')[0], 10) >= 25;
