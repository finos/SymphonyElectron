import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';

import { Logger } from '../common/loggerBase';
import { getCommandLineArgs } from '../common/utils';

const isCommandLineArgEnabled = (name: string) =>
  getCommandLineArgs(process.argv, `--${name}`, true) ||
  getCommandLineArgs(process.argv, `--${name}=1`, true) ||
  getCommandLineArgs(process.argv, `--${name}=true`, true);

/**
 * Load React Dev Tools extension
 * @param logger
 * @returns Promise<void>
 */
export const loadReactDevToolsExtension = async (logger: Logger) => {
  if (!isCommandLineArgEnabled('enableReactDevTools')) {
    return;
  }

  try {
    const name = await installExtension(REACT_DEVELOPER_TOOLS);
    logger.info(`main: Added Extension:  ${name}`);
  } catch (error) {
    logger.error(`main: Error while loading ReactDevTool Extension:  ${error}`);
  }
};
