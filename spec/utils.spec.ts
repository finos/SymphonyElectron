import { compareVersions, formatString, getCommandLineArgs, getGuid, throttle } from '../src/common/utils';

describe('utils', () => {
    describe('`compareVersions`', () => {
        it('should return -1 when v1 and v2 are invalid values', () => {
            expect(compareVersions('1.0-1-1-', '2.1-1-1-')).toBe(-1);
        });

        it('should return -1 when v1 < v2', () => {
            expect(compareVersions('v1.0', 'v2.1')).toBe(-1);
        });

        it('should return 1 when v1 > v2', () => {
            expect(compareVersions('v1.8', 'v1.1')).toBe(1);
        });

        it('should return 0 when v1 is equal to v2', () => {
            expect(compareVersions('v1.0', 'v1.0')).toBe(0);
        });

        describe('`compareVersions` using dash', () => {
            it('should return 0 when v1 is equal to v2', () => {
                expect(compareVersions('v1.0.8-beta1', 'v1.0.8-beta1')).toBe(0);
            });

            it('should return 1 when v1 is `string` and v2 is `number`', () => {
                expect(compareVersions('v1.0.8-beta', 'v1.0.8-1')).toBe(1);
            });

            it('should return -1 when v1 is `number` and v2 is `string`', () => {
                expect(compareVersions('v1.0.8-9', 'v1.0.8-beta')).toBe(-1);
            });

            it('should return -1 when v1 < v2', () => {
                expect(compareVersions('v1.0.0-beta1', 'v1.0.0-beta2')).toBe(-1);
            });

            it('should return 1 when v1 > v2', () => {
                expect(compareVersions('v1.0.0-beta5', 'v1.0.0-beta1')).toBe(1);
            });

             it('should return -1 when v1 is dashed and v2 is not', () => {
                 expect(compareVersions('v1.0.0-beta5', 'v1.0.0')).toBe(-1);
             });
        });
    });
    describe('`getGuid`', () => {
        it('should call `getGuid` correctly', () => {
            const valueFirst = getGuid();
            const valueSecond = getGuid();
            expect(valueFirst).not.toEqual(valueSecond);
        });

        it('should return 4 dashes when `getGuid` is called', () => {
            const dashCountGui = getGuid().split('-').length - 1;
            expect(dashCountGui).toBe(4);
        });

        it('should return 36 length when `getGuid` is called', () => {
            const lengthGui = getGuid().length;
            expect(lengthGui).toBe(36);
        });
    });

    describe('`getCommandLineArgs`', () => {
        const argName = '--url=';
        it('should call `getCommandLineArgs` correctly', () => {
            const myCustomArgs = process.argv;
            myCustomArgs.push(`--url='https://corporate.symphony.com'`);
            const expectedValue = `--url='https://corporate.symphony.com'`;
            expect(getCommandLineArgs(myCustomArgs, argName, false)).toBe(expectedValue);
        });

        it('should fail when the argv is invalid', () => {
            const fakeValue: any = 'null';
            const expectedValue = `get-command-line-args: TypeError invalid func arg, must be an array: ${fakeValue}`;
            expect(() => {
                getCommandLineArgs(fakeValue as string[], argName, false);
            }).toThrow(expectedValue);
        });
    });

    describe('`formatString', () => {
        const str = 'this will log {time}';
        const data = [{time: '1234'}];
        it('should return `str` when data is empty', () => {
            expect(formatString(str)).toEqual(str);
        });

        it('should replace key to dynamics values when `formatString` is used', () => {
            const expectedValue = 'this will log 1234';
            expect(formatString(str, data)).toBe(expectedValue);
        });

        it('should return `str` when `data` not match', () => {
            const dataTest = [{test: 123}];
            expect(formatString(str, dataTest)).toBe(str);
        });
    });

    describe('`throttle`', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        it('should fail when wait is invalid', () => {
            const functionMock = jest.fn();
            const invalidTime = -1;
            const expectedValue = `throttle: invalid throttleTime arg, must be a number: ${invalidTime}`;
            expect(() => {
                throttle(functionMock, invalidTime);
            }).toThrow(expectedValue);
        });

        it('should call `throttle` correctly', () => {
            const validTime = 3;
            const tempFn = throttle(jest.fn(), validTime);
            tempFn();
            expect(setTimeout).toBeCalledWith(expect.any(Function), validTime);
        });
    });
});
