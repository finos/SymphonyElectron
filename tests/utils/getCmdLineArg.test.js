const getCmdLineArg = require('../../js/utils/getCmdLineArg.js');

describe('getCmdLineArg tests', function() {
    it('should return no exact match', function() {
        const result = getCmdLineArg(['hello.exe', '--arg1', '--arg2'], '--arg', true);
        expect(result).toBe(null);
    });

    it('should return exact match only', function() {
        const result = getCmdLineArg(['hello.exe', '--arg1', '--arg2'], '--arg2', true);
        expect(result).toBe('--arg2');
    });

    it('should return starts with match', function() {
        const result = getCmdLineArg(['hello.exe', '--hello=test', '--arg2'], '--hello=', false);
        expect(result).toBe('--hello=test');
    });

    it('should return no match for starts with', function() {
        const result = getCmdLineArg(['hello.exe', '--hello=test', '--arg2'], '--help=', false);
        expect(result).toBe(null);
    });

    it('should return no match invalid argv given', function() {
        const result = getCmdLineArg('invalid argv', '--help=', false);
        expect(result).toBe(null);
    });
});
