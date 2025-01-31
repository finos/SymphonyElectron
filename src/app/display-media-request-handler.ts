import { session } from 'electron';

/**
 * This is currently supported only on macOS 15+.
 * setDisplayMediaRequestHandler injects into navigator.mediaDevices.getDisplayMedia().
 * With the macOS-only option { useSystemPicker: true },
 * everyting is handled natively by the OS.
 *
 * For all other OSes and versions, the regular screen share flow will be used.
 */
export const setDisplayMediaRequestHandler = () => {
  const { defaultSession } = session;

  defaultSession.setDisplayMediaRequestHandler(
    async (_request, _callback) => {
      // TODO - Add support for Windows.
    },
    { useSystemPicker: true },
  );
};
