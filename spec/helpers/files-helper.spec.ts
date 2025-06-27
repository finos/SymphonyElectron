import * as fs from 'fs';
import {
  convertFileName,
  isValidWindowsFileName,
  isValidWindowsFilePath,
  copyOneSingleFile,
  copyFiles,
  copyFileUsingReadWrite,
} from '../../src/app/helpers/file/files-helper';
import { isWindowsOS } from '../../src/common/env';

describe('files-helper', () => {
  let fsMock;
  let logs = [
    'C9Zeus.2529612.log',
    'C9Zeus.1.log',
    'C9Trader.25296.log',
    'C9Trader.25.log',
    'HEHE.txt',
    'HAH.txt',
  ];
  beforeEach(() => {
    fsMock = jest.spyOn(fs, 'readdirSync').mockImplementation(() => logs);
  });

  afterEach(() => {
    fsMock.mockRestore();
  });

  it('should clean file names', () => {
    const validatedFileName = convertFileName('console.log("hello world").txt');

    expect(validatedFileName).toBe('console.log__hello_world__.txt');
  });

  it('should have a proper file path - false', () => {
    const validatedPath = isValidWindowsFilePath(
      'SELEC*FROM ABC/hello-world/haha',
    );

    expect(validatedPath).toBe(false);
  });

  it('should clean file path - true', () => {
    const validatedPath = isValidWindowsFilePath('C:\\Users');

    if (isWindowsOS) {
      expect(validatedPath).toBe(true);
    } else {
      expect(validatedPath).toBe(false);
    }
  });

  it('should return true if file name did not violate any rules', () => {
    const validatedPath = isValidWindowsFileName('abcdef.log');

    expect(validatedPath).toBe(true);
  });

  it('should check violated rule - windows prevention', () => {
    const validatedPath = isValidWindowsFileName('CON.log');

    expect(validatedPath).toBe(false);
  });

  it('should check violated rule - windows invalid characters', () => {
    const validatedPath = isValidWindowsFileName('\\.log');

    expect(validatedPath).toBe(false);
  });

  it('should perform correct file copy', () => {
    const spyCopyFileSync = spyOn(fs, 'copyFileSync');

    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);

    copyOneSingleFile('C:\\abc.log', 'C:\\logs');

    expect(spyCopyFileSync).toBeCalledWith('C:\\abc.log', 'C:\\logs');
  });

  it('should perform correct file copy', () => {
    const spyCopyFileSync = spyOn(fs, 'copyFileSync');

    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);

    copyOneSingleFile('C:\\abc.log', 'C:\\logs');

    expect(spyCopyFileSync).toBeCalledWith('C:\\abc.log', 'C:\\logs');
  });

  it('should perform correct file copy via read and write method', () => {
    const spyCopyFileSync = spyOn(fs, 'writeFileSync');

    jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation((sourcePath: string) => sourcePath);

    copyFileUsingReadWrite('C:\\abc.log', 'C:\\logs');

    expect(spyCopyFileSync).toBeCalledWith('C:\\logs', 'C:\\abc.log');
  });

  it('should perform correct file copy via copyFiles', () => {
    const spyReaddir = jest.spyOn(fs, 'readdir');

    jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((sourcePath: string) => !!sourcePath);

    copyFiles('C:\\abc.log', 'C:\\logs', []);

    expect(spyReaddir).toBeCalledWith('C:\\abc.log', expect.any(Function));
  });
});
