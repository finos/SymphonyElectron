import { config } from '../app/config-handler';

const urlParts = /^(https?:\/\/)?([^/]*@)?(.+?)(:\d{2,5})?([/?].*)?$/;
const dot = /\./g;

interface IURLObject {
    tld: string;
    domain: string;
    subdomain: string;
}

export class WhitelistHandler {

    /**
     * Loops through the list of whitelist urls
     * @param url {String} - url the electron is navigated to
     *
     * @returns {boolean}
     */
    public isWhitelisted(url: string): boolean {
        const { whitelistUrl } = config.getConfigFields([ 'whitelistUrl' ]);

        return this.checkWhitelist(url, whitelistUrl);
    }

    /**
     * Splits the url into tld, domain, subdomain
     * @param url
     *
     * @return {{tld: string | *, domain: string | *, subdomain: string}}
     */
    public parseDomain(url): IURLObject {
        let urlSplit = url.match(urlParts);
        let domain = urlSplit[3];

        // capture top level domain
        const tld = domain.slice(domain.lastIndexOf('.'));
        urlSplit = domain.slice(0, -tld.length).split(dot);

        // capture domain
        domain = urlSplit.pop();

        // capture subdomain
        const subdomain = urlSplit.join('.');

        return {
            tld: tld.trim(),
            domain: domain.trim(),
            subdomain: subdomain.trim(),
        };
    }

    /**
     * Method that compares url against a list of whitelist
     * returns true if hostName or domain present in the whitelist
     *
     * @param url {String} - url the electron is navigated to
     * @param whitelistUrl {String} - comma separated whitelists
     *
     * @returns {boolean}
     */
    private checkWhitelist(url: string, whitelistUrl: string): boolean {
        const whitelistArray: string[] = whitelistUrl.split(',');
        const parsedUrl = this.parseDomain(url);

        if (!parsedUrl) {
            return false;
        }

        if (!whitelistUrl) {
            return false;
        }

        if (!whitelistArray.length || whitelistArray.indexOf('*') !== -1) {
            return true;
        }

        return whitelistArray.some((whitelistHost) => {
            const parsedWhitelist = this.parseDomain(whitelistHost);

            if (!parsedWhitelist) {
                return false;
            }

            return this.matchDomains(parsedUrl, parsedWhitelist);
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
     * @returns {boolean}
     */
    private matchDomains(parsedUrl: IURLObject, parsedWhitelist: IURLObject): boolean {
        if (!parsedUrl || !parsedWhitelist) {
            return false;
        }
        if (
            parsedUrl.subdomain === parsedWhitelist.subdomain
            && parsedUrl.domain === parsedWhitelist.domain
            && parsedUrl.tld === parsedWhitelist.tld
        ) {
            return true;
        }

        const hostNameFromUrl = parsedUrl.domain + parsedUrl.tld;
        const hostNameFromWhitelist = parsedWhitelist.domain + parsedWhitelist.tld;

        if (!parsedWhitelist.subdomain) {
            return hostNameFromUrl === hostNameFromWhitelist;
        }

        return hostNameFromUrl === hostNameFromWhitelist && this.matchSubDomains(parsedUrl.subdomain, parsedWhitelist.subdomain);
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
    private matchSubDomains(subDomainUrl: string, subDomainWhitelist: string): boolean {
        if (subDomainUrl === subDomainWhitelist) {
            return true;
        }

        const subDomainUrlArray = subDomainUrl.split('.');
        const lastCharSubDomainUrl = subDomainUrlArray[subDomainUrlArray.length - 1];

        const subDomainWhitelistArray = subDomainWhitelist.split('.');
        const lastCharWhitelist = subDomainWhitelistArray[subDomainWhitelistArray.length - 1];

        return lastCharSubDomainUrl === lastCharWhitelist;
    }

}

const whitelistHandler = new WhitelistHandler();

export { whitelistHandler };
