import { session } from 'electron';
import { promises } from 'fs';
import * as os from 'os';
import path = require('path');

import { Logger } from '../common/loggerBase';
import { getCommandLineArgs } from '../common/utils';

/**
 * Return Chrome extensions folder path if it exists
 * @returns Promise<string> Chrome extensions folder path if it exists or empty string
 */
const getExtensionsFolderPath = async (extensionId: string) => {
  const platform = os.platform();
  if (platform === 'win32') {
    const { LOCALAPPDATA } = process.env;
    const dataPath = `${LOCALAPPDATA}\\Google\\Chrome\\User Data\\`;
    let userPath = `${dataPath}Default`;
    let extensionPath = `${userPath}\\Extensions\\${extensionId}`;

    extensionPath = await exists(extensionPath);
    if (extensionPath) {
      return extensionPath;
    }

    let userId = 0;
    userPath = `${dataPath}Profile ${userId}`;
    do {
      extensionPath = await exists(`${userPath}\\Extensions\\${extensionId}`);
      userPath = `${dataPath}Profile ${++userId}`;
    } while (!extensionPath && (await exists(userPath)));

    return extensionPath;
  } else if (platform === 'darwin') {
    const macOsPath = `/Library/Application Support/Google/Chrome/Default/Extensions/${extensionId}`;
    return exists(macOsPath);
  } else if (platform === 'linux') {
    const paths = [
      `~/.config/google-chrome/Default/Extensions/${extensionId}`,
      `~/.config/google-chrome-beta/Default/Extensions/${extensionId}`,
      `~/.config/google-chrome-canary/Default/Extensions/${extensionId}`,
      `~/.config/chromium/Default/Extensions/${extensionId}`,
    ];

    for (const path of paths) {
      if (await exists(path)) {
        return path;
      }
    }
  }
  return '';
};

/**
 * Load React Dev Tools extension
 * @param logger
 * @returns Promise<void>
 */
export const loadReactDevToolsExtension = async (logger: Logger) => {
  if (
    !getCommandLineArgs(process.argv, '--reactDevToolsEnabled', true) &&
    !getCommandLineArgs(process.argv, '--reactDevToolsEnabled=1', true) &&
    !getCommandLineArgs(process.argv, '--reactDevToolsEnabled=true', true)
  ) {
    return;
  }

  const reactDevToolsExtensionId = 'fmkadmapgofadopljbjfkapdkoienihi';
  let extensionsPath = await getExtensionsFolderPath(reactDevToolsExtensionId);
  if (!extensionsPath) {
    logger.info(`main: ReactDevTools extension not found`);
    return;
  }

  const versionFolders = await readdir(extensionsPath);
  if (!versionFolders.length) {
    logger.info(`main: ReactDevTools extension version folder not found`);
    return;
  }
  extensionsPath = path.join(extensionsPath, versionFolders[0]);

  logger.info(`main: Loading ReactDevTools extension ${versionFolders[0]}`);
  await session.defaultSession.loadExtension(extensionsPath);
  logger.info(`main: ReactDevTools extension loaded`);
};

const { access, constants, readdir } = promises;

/**
 * Asynchronously check if path exists
 * @param path
 * @returns Promise<string> path if path exists or empty string
 */
const exists = async (path: string) => {
  try {
    await access(path, constants.R_OK);
    return path;
  } catch (error) {
    return '';
  }
};
