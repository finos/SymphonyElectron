import { app, WebContents } from 'electron';
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
  private _statusCallback: StatusCallback | undefined;

  /**
   * Starts the c9shell process
   */
  public startShell() {
    if (this._attachExistingC9Shell()) {
      return;
    }

    if (!this._c9shell) {
      this._c9shell = this._launchC9Shell();
    }
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
  public terminateShell() {
    if (!this._c9shell) {
      return;
    }
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
   * Launches the correct c9shell process
   */
  private _launchC9Shell(): ChildProcess | undefined {
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

    logger.info('c9-shell: launching shell', c9ShellPath, customC9ShellArgList);
    this._updateStatus({ status: 'starting' });

    const c9Shell = spawn(
      c9ShellPath,
      ['--symphonyHost', uniquePipeName, ...customC9ShellArgList],
      {
        stdio: 'pipe',
      },
    );
    c9Shell.on('close', (code) => {
      logger.info('c9-shell: closed with code', code);
      this._c9shell = undefined;
      this._updateStatus({ status: 'inactive' });
    });
    c9Shell.on('spawn', () => {
      logger.info('c9-shell: shell process successfully spawned');
      this._updateStatus({
        status: 'active',
        pipeName: 'symphony-c9-' + uniquePipeName,
      });
    });
    c9Shell.stdout.on('data', (data) => {
      logger.info(`c9-shell: ${data.toString().trim()}`);
    });
    c9Shell.stderr.on('data', (data) => {
      logger.error(`c9-shell: ${data.toString().trim()}`);
    });

    return c9Shell;
  }
}

let c9ShellHandler: C9ShellHandler | undefined;

/**
 * Starts the C9 shell process asynchronously, if not already started.
 */
export const loadC9Shell = (sender: WebContents) => {
  if (!isWindowsOS) {
    logger.error("c9-shell: can't load shell on non-Windows OS");
    return;
  }
  if (!c9ShellHandler) {
    c9ShellHandler = new C9ShellHandler();
  }
  c9ShellHandler.setStatusCallback((status: IShellStatus) => {
    logger.info('c9-shell: sending status', status);
    sender.send('c9-status-event', { status });
  });
  c9ShellHandler.startShell();
};

/**
 * Terminates the C9 shell process asynchronously, if it is running.
 */
export const terminateC9Shell = (_sender: WebContents) => {
  if (!c9ShellHandler) {
    return;
  }
  c9ShellHandler.terminateShell();
};
