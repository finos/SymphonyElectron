const { checkWhiteList } = require('../../js/utils/isWhiteList');

describe('validate url with whiteList', function() {

    describe('checkWhiteList truth tests', function() {

        it('should return true when the url is valid', function() {
            const whiteList = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://my.symphony.com/';

            return expect(checkWhiteList(url, whiteList)).toBeTruthy();
        });

        it('should return true when if hostName is defined', function() {
            const whiteList = 'www.symphony.com, app.symphony.com, symphony.com';
            const url = 'https://xyz.symphony.com/';

            return expect(checkWhiteList(url, whiteList)).toBeTruthy();
        });

        it('should return true when the first occurrence of sub-domain is matched', function() {
            const whiteList = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://xyz.my.symphony.com/';

            return expect(checkWhiteList(url, whiteList)).toBeTruthy();
        });

        it('should return true when for any URL if whiteList has *', function() {
            const whiteList = '*';
            const url = 'https://www.example.com/';

            return expect(checkWhiteList(url, whiteList)).toBeTruthy();
        });

    });

    describe('checkWhiteList falsity tests', function () {

        it('should return false when sub-domain does not match', function () {
            const whiteList = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://xyz.symphony.com/';

            return expect(checkWhiteList(url, whiteList)).toBeFalsy();
        });

        it('should return false when hostName does not match', function () {
            const whiteList = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'https://my.example.com/';

            return expect(checkWhiteList(url, whiteList)).toBeFalsy();
        });

        it('should return false when the URL is invalid', function () {
            const whiteList = 'www.symphony.com, app.symphony.com, my.symphony.com';
            const url = 'invalidUrl';

            return expect(checkWhiteList(url, whiteList)).toBeFalsy();
        });

        it('should return false when the whiteList is invalid', function () {
            const whiteList = 'invalidWhiteList';
            const url = 'https://www.symphony.com';

            return expect(checkWhiteList(url, whiteList)).toBeFalsy();
        });

        it('should return false if whiteList is empty', function() {
            const whiteList = '';
            const url = 'https://www.example.com/';

            return expect(checkWhiteList(url, whiteList)).toBeFalsy();
        });
    });
});