import { app } from 'electron';
export const isDevEnv = !app?.isPackaged;
export const isElectronQA = !!process.env.ELECTRON_QA;

export const isMac = process.platform === 'darwin';
export const isWindowsOS = process.platform === 'win32';
export const isLinux = process.platform === 'linux';
