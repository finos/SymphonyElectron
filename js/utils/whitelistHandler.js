'use strict';

const { getGlobalConfigField } = require('./../config.js');
const isEqual = require('lodash.isequal');
const log = require('../log.js');
const logLevels = require('../enums/logLevels.js');

let customTlds = [];

getGlobalConfigField('customTlds')
    .then((domains) => {
        
        if (domains && Array.isArray(domains) && domains.length > 0) {
            log.send(logLevels.INFO, `setting custom tlds that are -> ${domains}`);
            customTlds = domains;
        }
        
    })
    .catch((err) => {
        log.send(logLevels.INFO, `error setting custom tlds -> ${err}`);
    });

const urlParts = /^(https?:\/\/)?([^/]*@)?(.+?)(:\d{2,5})?([/?].*)?$/;
const dot = /\./g;

/**
 * Loops through the list of whitelist urls
 * @param url {String} - url the electron is navigated to
 * @returns {Promise}
 */
function isWhitelisted(url) {

    return new Promise((resolve, reject) => {
        getGlobalConfigField('whitelistUrl').then((whitelist) => {

            if (checkWhitelist(url, whitelist)) {
                return resolve();
            }

            return reject(new Error('URL does not match with the whitelist'));

        }).catch((err) => {
            reject(err);
        });
    });
}

/**
 * Method that compares url against a list of whitelist
 * returns true if hostName or domain present in the whitelist
 * @param url {String} - url the electron is navigated to
 * @param whitelist {String} - coma separated whitelists
 * @returns {boolean}
 */
function checkWhitelist(url, whitelist) {
    let whitelistArray = whitelist.split(',');
    const parsedUrl = parseDomain(url, {customTlds});

    if (!parsedUrl) {
        return false;
    }

    if (!whitelist) {
        return false;
    }

    if (!whitelistArray.length || whitelistArray.indexOf('*') !== -1) {
        return true;
    }

    return whitelistArray.some((whitelistHost) => {
        let parsedWhitelist = parseDomain(whitelistHost);

        if (!parsedWhitelist) {
            return false;
        }

        return matchDomains(parsedUrl, parsedWhitelist);
    });
}

/**
 * Matches the respective hostName
 * @param parsedUrl {Object} - parsed url
 * @param parsedWhitelist {Object} - parsed whitelist
 *
 * example:
 * matchDomain({ subdomain: www, domain: example, tld: com }, { subdomain: app, domain: example, tld: com })
 *
 * @returns {*}
 */
function matchDomains(parsedUrl, parsedWhitelist) {

    if (isEqual(parsedUrl, parsedWhitelist)) {
        return true;
    }

    const hostNameFromUrl = parsedUrl.domain + parsedUrl.tld;
    const hostNameFromWhitelist = parsedWhitelist.domain + parsedWhitelist.tld;

    if (!parsedWhitelist.subdomain) {
        return hostNameFromUrl === hostNameFromWhitelist
    }

    return hostNameFromUrl === hostNameFromWhitelist && matchSubDomains(parsedUrl.subdomain, parsedWhitelist.subdomain);

}

/**
 * Matches the last occurrence in the sub-domain
 * @param subDomainUrl {String} - sub-domain from url
 * @param subDomainWhitelist {String} - sub-domain from whitelist
 *
 * example: matchSubDomains('www', 'app')
 *
 * @returns {boolean}
 */
function matchSubDomains(subDomainUrl, subDomainWhitelist) {

    if (subDomainUrl === subDomainWhitelist) {
        return true;
    }

    const subDomainUrlArray = subDomainUrl.split('.');
    const lastCharSubDomainUrl = subDomainUrlArray[subDomainUrlArray.length - 1];

    const subDomainWhitelistArray = subDomainWhitelist.split('.');
    const lastCharWhitelist = subDomainWhitelistArray[subDomainWhitelistArray.length - 1];

    return lastCharSubDomainUrl === lastCharWhitelist;
}

/**
 * Splits the url into tld, domain, subdomain
 * @param url
 * @return {{tld: string | *, domain: string | *, subdomain: string}}
 */
function parseDomain(url) {
    let urlSplit = url.match(urlParts);
    let domain = urlSplit[3];

    // capture top level domain
    const tld = domain.slice(domain.lastIndexOf('.'));
    urlSplit = domain.slice(0, -tld.length).split(dot);

    // capture domain
    domain = urlSplit.pop();

    // capture subdomain
    const subdomain = urlSplit.join(".");

    return {
        tld: tld.trim(),
        domain: domain.trim(),
        subdomain: subdomain.trim()
    }
}

module.exports = {
    isWhitelisted,

    // items below here are only exported for testing, do NOT use!
    checkWhitelist

};
