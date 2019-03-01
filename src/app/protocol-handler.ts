import { apiName } from '../common/api-interface';
import { isMac, isWindowsOS } from '../common/env';
import { getCommandLineArgs } from '../common/utils';
import { activate } from './window-actions';

enum protocol {
    SymphonyProtocol = 'symphony://',
}

class ProtocolHandler {

    private static isValidProtocolUri = (uri: string): boolean => !!(uri && uri.startsWith(protocol.SymphonyProtocol));

    private preloadWebContents: Electron.WebContents | null = null;
    private protocolUri: string | null = null;

    constructor() {
        this.processArgv();
    }

    /**
     * Stores the web contents of the preload
     *
     * @param webContents {Electron.WebContents}
     */
    public setPreloadWebContents(webContents: Electron.WebContents): void {
        this.preloadWebContents = webContents;
        // check for cashed protocol uri and process it
        if (this.protocolUri) {
            this.sendProtocol(this.protocolUri);
            this.protocolUri = null;
        }
    }

    /**
     * Sends the protocol uri to the web app to further process
     *
     * @param uri {String}
     * @param isAppRunning {Boolean} - whether the application is running
     */
    public sendProtocol(uri: string, isAppRunning: boolean = true): void {
        if (!this.preloadWebContents || !isAppRunning) {
            this.protocolUri = uri;
            return;
        }
        // This is needed for mac OS as it brings pop-outs to foreground
        // (if it has been previously focused) instead of main window
        if (isMac) activate(apiName.mainWindowName);

        if (ProtocolHandler.isValidProtocolUri(uri)) {
            this.preloadWebContents.send('protocol-action', uri);
        }
    }

    /**
     * Handles protocol uri from process.argv
     *
     * @param argv {String[]} - data received from process.argv
     */
    public processArgv(argv?: string[]): void {
        const protocolUriFromArgv = getCommandLineArgs(argv || process.argv, protocol.SymphonyProtocol, false);
        if (isWindowsOS && protocolUriFromArgv) {
            this.sendProtocol(protocolUriFromArgv, false);
        }
    }
}

const protocolHandler = new ProtocolHandler();

export { protocolHandler };