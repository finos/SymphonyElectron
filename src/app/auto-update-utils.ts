import fetch from 'electron-fetch';
import { logger } from '../common/logger';

export const fetchLatestVersion = async (
  url: string,
  autoUpdateTimeout: number,
  versionRegexp: RegExp,
): Promise<string | undefined> => {
  logger.info('auto-update-handler: fetching latest version info from', url);

  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), autoUpdateTimeout);

  try {
    const response = await fetch(url, { signal });
    clearTimeout(timeoutId);
    if (!response || !response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const responseText = await response.text();
    logger.info(
      'auto-update-handler: latest version info from server',
      responseText,
    );

    const match = versionRegexp.exec(responseText);
    return match?.[1];
  } catch (error: any) {
    if (controller.signal.aborted) {
      logger.warn('auto-update-handler: fetch aborted due to timeout', url);
    } else {
      logger.error('auto-update-handler: error fetching version', url, error);
    }
    return undefined;
  } finally {
    clearTimeout(timeoutId);
  }
};
