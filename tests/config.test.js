const { getConfigField } = require('../js/config');

// mock required so getConfig reads config from correct path
jest.mock('../js/utils/misc.js', function() {
    return {
        isDevEnv: false,
        isMac: false
    }
});

test('getConfig should have proper url', function() {
    return getConfigField('url').then(function(url) {
        expect(url).toBe('https://my.symphony.com');
    });
});
