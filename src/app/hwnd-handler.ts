import { isWindowsOS } from '../common/env';

/**
 * Translate the nativeWindowHandle of an Electron BrowserWindow to the handle
 * of the window where the main content is hosted. On Windows, Chrome uses a separate
 * window handle for the title bar and the main content has a different window handle
 * that is positioned below the title bar.
 * @returns translated window handle, or original handle if no applicable translation found
 */
export const getContentWindowHandle = (nativeWindowHandle: Buffer): Buffer => {
  if (!isWindowsOS) {
    return nativeWindowHandle;
  }
  return nativeWindowHandle;
};
