import { app } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { spawn } from 'child_process';
import { isDevEnv, isElectronQA, isWindowsOS } from '../common/env';
import { logger } from '../common/logger';

class AutoUpdate {
  private readonly tempDir: string;
  private filename: string;
  private logFilePath: string;
  private updateUtil: string;
  private updateUtilArgs: ReadonlyArray<string>;

  constructor() {
    if (isElectronQA) {
      this.tempDir = os.tmpdir();
    } else {
      this.tempDir = path.join(app.getPath('userData'), 'temp');
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir);
      }
    }

    this.filename = '';
    this.logFilePath = path.join(this.tempDir, 'auto_update.log');

    this.updateUtil = isDevEnv
      ? path.join(
          __dirname,
          '../../../node_modules/auto-update/auto_update_helper.exe',
        )
      : path.join(path.dirname(app.getPath('exe')), 'auto_update_helper.exe');

    this.updateUtilArgs = [];
  }

  /**
   * Launch the auto update helper
   */
  public async update(filename: string) {
    logger.info(`auto-update-handler: Starting auto update!`);
    this.filename = filename;
    if (isWindowsOS) {
      this.updateUtilArgs = [
        this.filename,
        app.getPath('exe'),
        this.logFilePath,
      ];
      logger.info(
        `auto-update-handler: Running update helper${this.updateUtil} with args ${this.updateUtilArgs}!`,
      );

      try {
        spawn(this.updateUtil, this.updateUtilArgs);
      } catch (error) {
        logger.error(
          `auto-update-handler: auto update failed. Error: ${error}!`,
        );
      }
    }
  }
}

const autoUpdate = new AutoUpdate();

export { autoUpdate };
