import { Library } from 'ffi-napi';
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
  if (nativeWindowHandle.byteLength < 8) {
    return nativeWindowHandle;
  }

  const user32 = Library('user32.dll', {
    FindWindowExA: ['int', ['int', 'int', 'string', 'string']],
    GetWindowRect: ['int', ['int', 'pointer']],
  });

  const getWindowRect = (hwnd: bigint) => {
    const rect = Buffer.alloc(16);

    const ret = user32.GetWindowRect(hwnd.toString(), rect);
    if (ret) {
      return {
        left: rect.readInt32LE(0),
        top: rect.readInt32LE(4),
        right: rect.readInt32LE(8),
        bottom: rect.readInt32LE(12),
      };
    } else {
      return undefined;
    }
  };

  const parentHwnd = nativeWindowHandle.readBigUInt64LE();
  const parentRect = getWindowRect(parentHwnd);
  if (!parentRect) {
    return nativeWindowHandle;
  }

  let child = user32.FindWindowExA(
    parentHwnd.toString(),
    0,
    'Chrome_RenderWidgetHostHWND',
    null,
  );
  while (child !== 0) {
    const rect = getWindowRect(child);

    // The candidate child window is located at the same x position as the parent window, but
    // has a higher y position (due to the window title frame at the top).
    if (rect && parentRect.left === rect.left && parentRect.top < rect.top) {
      const ret = Buffer.alloc(8);
      ret.writeBigUInt64LE(BigInt(child));
      return ret;
    }
    child = user32.FindWindowExA(
      parentHwnd.toString(),
      child,
      'Chrome_RenderWidgetHostHWND',
      null,
    );
  }
  return nativeWindowHandle;
};
