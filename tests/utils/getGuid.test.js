const getGuid = require('../../js/utils/getGuid.js');

describe('guid tests', function () {
    it('should have valid length', function () {
        var guid = getGuid();
        expect(guid.length).toBe(36);
        var parts = guid.split('-');
        expect(parts.length).toBe(5);
        expect(parts[0].length).toBe(8);
        expect(parts[1].length).toBe(4);
        expect(parts[2].length).toBe(4);
        expect(parts[3].length).toBe(4);
        expect(parts[4].length).toBe(12);
    });

    it('should only contains hex chars', function () {
        for (var i = 0; i < 100; i++) {
            var guid = getGuid();
            var parts = guid.split('-');
            parts.forEach(function (part) {
                expect(/^([A-Fa-f0-9]{2})+$/.test(part)).toBe(true);
            });
        }
    });
});
