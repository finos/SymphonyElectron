import { compareVersions, formatString, getCommandLineArgs, getGuid, throttle, calculatePercentage } from '../src/common/utils';

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
        const strReplaced = 'this will log time';
        const data = { time: '1234' };
        it('should return `str` when data is empty', () => {
            expect(formatString(str)).toEqual(str);
        });

        it('should replace key to dynamics values when `formatString` is used', () => {
            const expectedValue = 'this will log 1234';
            expect(formatString(str, data)).toBe(expectedValue);
        });

        it('should replace multiple keys to dynamics values when `formatString` is used', () => {
            const dataTest = { multiple: true, placed: 'correct' };
            expect(formatString('The string with {multiple} values {placed}', dataTest)).toBe('The string with true values correct');
        });

        it('should return `str` when `data` not match', () => {
            const dataTest = { test: 123 };
            expect(formatString(str, dataTest)).toBe(strReplaced);
        });

        it('should return `str` when `data` is undefined', () => {
            const dataTest = { multiple: 'multiple', invalid: undefined };
            expect(formatString('The string with {multiple} values {invalid}', dataTest)).toBe('The string with multiple values invalid');
        });
    });

    describe('`throttle`', () => {
        let origNow;
        let now;
        beforeEach(() => {
            origNow = Date.now;
            // mock date func
            Date.now = () => {
                return now;
            };
            now = 10000;
        });

        afterEach(() => {
            // restore original
            Date.now = origNow;
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
            jest.useFakeTimers();
            const validTime = 1000;
            const functionMock = jest.fn();
            const tempFn = throttle(functionMock, validTime);
            for (let i = 0; i < 3; i++) {
                tempFn();
            }
            now += 1000;
            jest.runTimersToTime(1000);
            tempFn();
            expect(functionMock).toBeCalledTimes(2);
        });
    });

    describe('calculatePercentage', () => {
        it('should calculate the percentage correctly', () => {
            expect(calculatePercentage(1440, 90)).toBe(1296);
        });

        it('should calculate the percentage correctly for 50', () => {
            expect(calculatePercentage(500, 50)).toBe(250);
        });
    });
});
