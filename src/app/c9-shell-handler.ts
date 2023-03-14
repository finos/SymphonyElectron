import { app, powerMonitor, WebContents } from 'electron';
import { isDevEnv, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';

import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { getCommandLineArgs, getGuid } from '../common/utils';

/**
 * Current state of the C9 shell process.
 */
export interface IShellStatus {
  status: 'inactive' | 'starting' | 'active';
  pipeName?: string;
}

type StatusCallback = (status: IShellStatus) => void;

class C9ShellHandler {
  private _c9shell: ChildProcess | undefined;
  private _curStatus: IShellStatus | undefined;
  private _isDisconnected = false;
  private _isFreshStart = true;
  private _isStarting = false;
  private _isTerminating = false;
  private _sender: WebContents;
  private _shouldRestart = false;
  private _statusCallback: StatusCallback | undefined;

  constructor(sender: WebContents) {
    this._sender = sender;

    powerMonitor.on('suspend', () => {
      logger.info('c9-shell-handler: suspend');
      this.terminateShell();
    });

    powerMonitor.on('resume', () => {
      logger.info('c9-shell-handler: resume');
      this.startShell();
    });
  }

  /**
   * Starts the c9shell process
   */
  public async startShell() {
    if (this._attachExistingC9Shell()) {
      logger.info('c9-shell-handler: _attachExistingC9Shell, skip start');
      return;
    }

    if (this._isStarting) {
      logger.info('c9-shell-handler: _isStarting, skip start');
      return;
    }

    this._isStarting = true;

    if (!this._c9shell) {
      logger.info('c9-shell-handler: start');
      this._c9shell = await this._launchC9Shell(); // _c9shell won't be set until the promise is resolved/rejected
    } else {
      logger.info('c9-shell-handler: _c9shell, skip start');
    }

    this._isStarting = false;
  }

  /**
   * Allows the C9 extension to subscribe to shell status updates. Immediately sends current status.
   */
  public setStatusCallback(callback: StatusCallback) {
    this._statusCallback = callback;
    if (this._curStatus) {
      this._statusCallback(this._curStatus);
    }
  }

  /**
   * Terminates the c9shell process if it was started by this handler.
   */
  public terminateShell(shouldRestart = false) {
    if (this._isTerminating) {
      logger.info('c9-shell-handler: _isTerminating, skip terminate');
      return;
    }

    if (!this._c9shell) {
      logger.info('c9-shell-handler: no _c9shell, skip terminate');
      return;
    }

    logger.info('c9-shell-handler: terminate');
    this._isTerminating = true;
    this._shouldRestart = shouldRestart;
    this._c9shell.kill();
  }

  /**
   * Update the current shell status and notify the callback if set.
   */
  private _updateStatus(status: IShellStatus) {
    this._curStatus = status;
    if (this._statusCallback) {
      this._statusCallback(status);
    }
  }

  /**
   * Checks if the user wants to control the C9 shell process explicitly, returns true if so
   * @returns
   */
  private _attachExistingC9Shell(): boolean {
    const customC9ShellPipe = getCommandLineArgs(
      process.argv,
      '--c9pipe=',
      false,
    );
    if (customC9ShellPipe) {
      logger.info(`c9-shell: Using custom pipe: ${customC9ShellPipe}`);
      this._updateStatus({
        status: 'active',
        pipeName: 'symphony-c9-' + customC9ShellPipe.substring(9),
      });
      return true;
    } else {
      return false;
    }
  }

  /**
   * only return resolved proxy from Electron, if proxy-server or proxy-pac-url
   * was passed as arguments
   */
  private async _getCloud9ProxyArgs() {
    const hasProxyServerArgs = getCommandLineArgs(
      process.argv,
      '--proxy-server=',
      false,
    );
    const hasProxyPacFileArgs = getCommandLineArgs(
      process.argv,
      '--proxy-pac-url=',
      false,
    );

    if (hasProxyPacFileArgs || hasProxyServerArgs) {
      const proxy = (
        await this._sender.session.resolveProxy(this._sender.getURL() ?? '')
      )
        .split(';')[0]
        .replace('PROXY ', '');

      return ['--proxyServer', proxy];
    }
    return [];
  }

  /**
   * Launches the correct c9shell process
   */
  private async _launchC9Shell(): Promise<ChildProcess | undefined> {
    this._curStatus = undefined;
    const uniquePipeName = getGuid();

    const c9ShellPath = isDevEnv
      ? path.join(
          __dirname,
          '../../../node_modules/@symphony/symphony-c9-shell/shell/c9shell.exe',
        )
      : path.join(path.dirname(app.getPath('exe')), 'cloud9/shell/c9shell.exe');

    const customC9ShellArgs = getCommandLineArgs(
      process.argv,
      '--c9args=',
      false,
    );

    const customC9ShellArgList = customC9ShellArgs
      ? customC9ShellArgs.substring(9).split(' ')
      : [];

    customC9ShellArgList.push(
      ...[
        '--symphonyHost',
        uniquePipeName,
        ...(await this._getCloud9ProxyArgs()),
      ],
    );

    logger.info(
      'c9-shell: launching shell with path',
      c9ShellPath,
      customC9ShellArgList,
    );

    this._updateStatus({ status: 'starting' });
    this._isFreshStart = true;
    const c9Shell = spawn(c9ShellPath, customC9ShellArgList, { stdio: 'pipe' });

    c9Shell.on('close', (code) => {
      logger.info('c9-shell: closed with code', code);
      this._c9shell = undefined;
      this._isTerminating = false;
      this._updateStatus({ status: 'inactive' });
      if (this._shouldRestart) {
        this._shouldRestart = false;
        this.startShell();
      }
    });

    c9Shell.on('spawn', () => {
      logger.info('c9-shell: shell process successfully spawned');
      this._updateStatus({
        status: 'active',
        pipeName: 'symphony-c9-' + uniquePipeName,
      });
    });

    c9Shell.stdout.on('data', (data) => {
      const message: string = data.toString().trim();
      logger.info(`c9-shell: ${message}`);
      this._updateNetworkStatus(message);
    });

    c9Shell.stderr.on('data', (data) => {
      logger.error(`c9-shell: ${data.toString().trim()}`);
    });

    return c9Shell;
  }

  /**
   * Update network status
   * @param c9ShellMessage Any message provided by c9-shell
   */
  private _updateNetworkStatus(c9ShellMessage: string) {
    if (
      c9ShellMessage.includes('NetworkConnectivityService|Internet Available')
    ) {
      this._isFreshStart = false;
      if (this._isDisconnected) {
        this._isDisconnected = false;
        this._onNetworkReconnection();
      }
    } else if (
      c9ShellMessage.includes(
        'NetworkConnectivityService|No Internet Available',
      )
    ) {
      this._isDisconnected = !this._isFreshStart;
    }
  }

  /**
   * Executed after the network connection is restored
   */
  private _onNetworkReconnection() {
    this.terminateShell(true);
  }
}

let c9ShellHandler: C9ShellHandler | undefined;

/**
 * Starts the C9 shell process asynchronously, if not already started.
 */
export const loadC9Shell = async (sender: WebContents) => {
  if (!isWindowsOS) {
    logger.error("c9-shell: can't load shell on non-Windows OS");
    return;
  }
  if (!c9ShellHandler) {
    c9ShellHandler = new C9ShellHandler(sender);
  }
  c9ShellHandler.setStatusCallback((status: IShellStatus) => {
    logger.info('c9-shell: sending status', status);
    sender.send('c9-status-event', { status });
  });

  await c9ShellHandler.startShell();
};

/**
 * Terminates the C9 shell process asynchronously, if it is running.
 */
export const terminateC9Shell = () => {
  if (!c9ShellHandler) {
    return;
  }
  c9ShellHandler.terminateShell();
};
