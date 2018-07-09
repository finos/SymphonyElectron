const { isWhitelisted, matchDomains, parseDomain } = require('./utils/whitelistHandler');
const { getGlobalConfigField } = require('./config');
const { isDevEnv } = require('./utils/misc');

/**
 * Validate whitelist and location.origin
 * @param eventSender
 * @param origin {String} location.origin
 * @return {Promise<T>}
 */
function originCheck(eventSender, origin) {

    if (isDevEnv) {
        eventSender.send('initialize-api');
        return null;
    }

    return isWhitelisted(origin)
        .then(() => {
            eventSender.send('initialize-api', true);
        })
        .catch(() => {
            getGlobalConfigField('url')
                .then((configUrl) => {
                    if (matchDomains(parseDomain(origin), parseDomain(configUrl))) {
                        eventSender.send('initialize-api', true);
                    }
                });
        });

}

module.exports = originCheck;