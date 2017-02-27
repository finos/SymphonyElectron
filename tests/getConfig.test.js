const getConfig = require('../js/getconfig');

// mock required so getConfig reads config from correct path
jest.mock('../js/utils', function() {
    return {
        isDevEnv: false,
        isMac: false
    }
});

test('getConfig should have proper url', function() {
    return getConfig(false).then(function(result) {
        expect(result.url).toBe('https://my.symphony.com');
    });
});
