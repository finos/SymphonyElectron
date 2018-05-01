const { checkWhitelist } = require('../../js/utils/whitelistHandler');

describe('validate url with whitelist', function() {

    describe('checkWhitelist truth tests', function() {

        it('should return true when the url is valid', function() {
            const whitelist = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://my.symphony.com/';

            return expect(checkWhitelist(url, whitelist)).toBeTruthy();
        });

        it('should return true when if hostName is defined', function() {
            const whitelist = 'www.symphony.com, app.symphony.com, symphony.com';
            const url = 'https://xyz.symphony.com/';

            return expect(checkWhitelist(url, whitelist)).toBeTruthy();
        });

        it('should return true when the first occurrence of sub-domain is matched', function() {
            const whitelist = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://xyz.my.symphony.com/';

            return expect(checkWhitelist(url, whitelist)).toBeTruthy();
        });

        it('should return true when for any URL if whitelist has *', function() {
            const whitelist = '*';
            const url = 'https://www.example.com/';

            return expect(checkWhitelist(url, whitelist)).toBeTruthy();
        });

        it('should return true for non-standard TLDs', function() {
            const whitelist = 'symphony.com, symphony.econet';
            const url = 'https://my.symphony.econet/';

            return expect(checkWhitelist(url, whitelist)).toBeTruthy();
        });

    });

    describe('checkWhitelist falsity tests', function () {

        it('should return false when sub-domain does not match', function () {
            const whitelist = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://xyz.symphony.com/';

            return expect(checkWhitelist(url, whitelist)).toBeFalsy();
        });

        it('should return false when hostName does not match', function () {
            const whitelist = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://my.example.com/';

            return expect(checkWhitelist(url, whitelist)).toBeFalsy();
        });

        it('should return false when TLD does not match', function () {
            const whitelist = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://my.symphony.echonet/';

            return expect(checkWhitelist(url, whitelist)).toBeFalsy();
        });

        it('should return false when the URL is invalid', function () {
            const whitelist = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'invalidUrl';

            return expect(checkWhitelist(url, whitelist)).toBeFalsy();
        });

        it('should return false when the whitelist is invalid', function () {
            const whitelist = 'invalidWhitelist';
            const url = 'https://www.symphony.com';

            return expect(checkWhitelist(url, whitelist)).toBeFalsy();
        });

        it('should return false if whitelist is empty', function() {
            const whitelist = '';
            const url = 'https://www.example.com/';

            return expect(checkWhitelist(url, whitelist)).toBeFalsy();
        });
    });
});