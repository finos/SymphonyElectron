import { execFile, ExecFileException } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import { isDevEnv, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';

/**
 * Translate the nativeWindowHandle of an Electron BrowserWindow to the handle
 * of the window where the main content is hosted. On Windows, Chrome uses a separate
 * window handle for the title bar and the main content has a different window handle
 * that is positioned below the title bar.
 * @returns translated window handle, or original handle if no applicable translation found
 */
export const getContentWindowHandle = async (
  nativeWindowHandle: Buffer,
): Promise<any> => {
  const execCmd = (
    captureUtil: string,
    captureUtilArgs: ReadonlyArray<string>,
  ): Promise<any> => {
    logger.info(
      `screen-snippet-handlers: execCmd ${captureUtil} ${captureUtilArgs}`,
    );
    return new Promise<string>((resolve, reject) => {
      return execFile(
        captureUtil,
        captureUtilArgs,
        (error: ExecFileException | null, stdout: any) => {
          if (error && error.killed) {
            return reject(error);
          }
          resolve(stdout);
        },
      );
    });
  };

  const convertBuffer = (uint8Arr: Uint8Array) => {
    let result = 0;
    for (let i = uint8Arr.length - 1; i >= 0; i--) {
      result = result * 256 + uint8Arr[i];
    }
    return result;
  };

  const convertToUint8Array = (num: number) => {
    const arr = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      arr[i] = num % 256;
      num = Math.floor(num / 256);
    }
    return arr;
  };

  if (!isWindowsOS) {
    return nativeWindowHandle;
  }
  const dec = convertBuffer(nativeWindowHandle);
  logger.info(`hwnd-handler: getting content hwnd for ${dec}`, dec);
  const hwndExecPath = isDevEnv
    ? path.join(
        __dirname,
        '../../../node_modules/symphony-native-window-handle-helper/SymphonyNativeWindowHandleHelper.exe',
      )
    : path.join(
        path.dirname(app.getPath('exe')),
        'SymphonyNativeWindowHandleHelper.exe',
      );
  const hwndExecArgs = [dec.toString()];
  const output = await execCmd(hwndExecPath, hwndExecArgs);
  if (!output.length) {
    logger.error(
      'hwnd-handler: cannot retrieve the right window handle. Returning default one',
    );
    return nativeWindowHandle;
  }
  const intValue = parseInt(output, 10);
  logger.info(`hwnd-handler: returning content hwnd for ${dec}: ${intValue}`);
  const res = convertToUint8Array(intValue);
  return res;
};
