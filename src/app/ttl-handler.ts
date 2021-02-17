import { logger } from '../common/logger';

const ttlExpiryTime = -1;

export const getExpiryTime = (): number => {
  return ttlExpiryTime;
};

/**
 * Checks to see if the build is expired against a TTL expiry time
 */
export const checkIfBuildExpired = (): boolean => {
  logger.info(`ttl-handler: Checking for build expiry`);

  const expiryTime = getExpiryTime();

  if (expiryTime <= -1) {
    logger.info(`ttl-handler: Expiry not applicable for this build`);
    return false;
  }

  const currentDate: Date = new Date();
  const expiryDate: Date = new Date(expiryTime);
  logger.info(
    `ttl-handler: Current Time: ${currentDate.getTime()}, Expiry Time: ${expiryDate.getTime()}`,
  );

  const buildExpired = currentDate.getTime() > expiryDate.getTime();
  return buildExpired;
};
