export const isDevEnv = process.env.ELECTRON_DEV
  ? process.env.ELECTRON_DEV.trim().toLowerCase() === 'true'
  : false;
export const isElectronQA = !!process.env.ELECTRON_QA;

export const isMac = false;
export const isWindowsOS = true;
export const isLinux = process.platform === 'linux';

export const isNodeEnv = !!process.env.NODE_ENV;
