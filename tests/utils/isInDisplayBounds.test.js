const isInDisplayBounds = require('../../js/utils/isInDisplayBounds.js');

let displays;

jest.mock('electron', function() {
    return {
        screen: {
            getAllDisplays: mockedGetAllDisplays
        }
    }
});

function mockedGetAllDisplays() {
    return displays;
}

describe('isInDisplayBounds should', function() {
    it('return false when given no rect', function() {
        expect(isInDisplayBounds(null)).toBe(false);
    });

    function createMockDisplay(newDisplays) {
        displays = newDisplays;
    }

    it('return true when rect in display bounds', function() {
        createMockDisplay([{
            workArea: {
                width: 100,
                height: 100,
                x: 0,
                y: 0
            }
        }]);

        const rect = {
            x: 1,
            y: 1,
            width: 90,
            height: 90
        };

        expect(isInDisplayBounds(rect)).toBe(true);
    });

    it('return true when rect match exactly display', function() {
        createMockDisplay([{
            workArea: {
                width: 100,
                height: 100,
                x: 0,
                y: 0
            }
        }]);

        const rect = {
            x: 0,
            y: 0,
            width: 100,
            height: 100
        };

        expect(isInDisplayBounds(rect)).toBe(true);
    });

    it('return true when rect match exactly display', function() {
        createMockDisplay([{
            workArea: {
                width: 100,
                height: 100,
                x: 0,
                y: 0
            }
        }]);

        const rect = {
            x: 0,
            y: 0,
            width: 100,
            height: 100
        };

        expect(isInDisplayBounds(rect)).toBe(true);
    });

    it('return true when rect contained in at least one display', function() {

        let display1 = {
            workArea: {
                width: 100,
                height: 100,
                x: 0,
                y: 0
            }
        };
        let display2 = {
            workArea: {
                width: 100,
                height: 100,
                x: 100,
                y: 0
            }
        };
        createMockDisplay([ display1, display2 ]);

        const rect = {
            x: 110,
            y: 0,
            width: 50,
            height: 50
        };

        expect(isInDisplayBounds(rect)).toBe(true);
    });

    it('return false when rect is not in display bounds', function() {
        createMockDisplay([{
            workArea: {
                width: 100,
                height: 100,
                x: 0,
                y: 0
            }
        }]);

        const rect = {
            x: 0,
            y: 0,
            width: 100,
            height: 101
        };

        expect(isInDisplayBounds(rect)).toBe(false);
    });

    it('return false when rect spans two displays', function() {
        let display1 = {
            workArea: {
                width: 100,
                height: 100,
                x: 0,
                y: 0
            }
        };
        let display2 = {
            workArea: {
                width: 100,
                height: 100,
                x: 100,
                y: 0
            }
        };
        createMockDisplay([ display1, display2 ]);

        const rect = {
            x: 50,
            y: 50,
            width: 75,
            height: 25
        };

        expect(isInDisplayBounds(rect)).toBe(false);
    });
});
