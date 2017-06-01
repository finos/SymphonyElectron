const getCmdLineArg = require('../../js/utils/getCmdLineArg.js');

describe('getCmdLineArg tests', function() {
    it('should return no exact match', function() {
        var result = getCmdLineArg([ 'hello.exe', '--arg1', '--arg2'], '--arg', true);
        expect(result).toBe(null);
    });

    it('should return exact match only', function() {
        var result = getCmdLineArg([ 'hello.exe', '--arg1', '--arg2'], '--arg2', true);
        expect(result).toBe('--arg2');
    });

    it('should return starts with match', function() {
        var result = getCmdLineArg([ 'hello.exe', '--hello=test', '--arg2'], '--hello=');
        expect(result).toBe('--hello=test');
    });

    it('should return no match for starts with', function() {
        var result = getCmdLineArg([ 'hello.exe', '--hello=test', '--arg2'], '--help=');
        expect(result).toBe(null);
    });

    it('should return no match invalid argv given', function() {
        var result = getCmdLineArg('invalid argv', '--help=');
        expect(result).toBe(null);
    });
});
