import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IConfig, IGlobalConfig } from '../src/app/config-handler';
import { ConfigFieldsDefaultValues } from '../src/common/config-interface';

jest.mock('electron-log');
jest.mock('../src/app/auto-update-handler', () => {
  return {};
});
jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: true,
    isLinux: false,
    isMac: false,
    isDevEnv: true,
  };
});

jest.mock('../src/common/logger', () => {
  return {
    logger: {
      setLoggerWindow: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
  };
});

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: { isOnline: true },
  };
});

describe('config', () => {
  const configFileName: string = 'Symphony.config';
  let userConfigDir: string;
  let globalConfigDir: string;
  let configInstance: any;

  const createTempGlobalConfig = (fileName: string): string => {
    const tmpDir = os.tmpdir();
    return path.join(fs.mkdtempSync(path.join(tmpDir, 'config-')), fileName);
  };

  const createTempUserConfig = (fileName: string): string => {
    const tmpDir = os.tmpdir();
    return path.join(fs.mkdtempSync(path.join(tmpDir, 'user-')), fileName);
  };

  // write data in global config created
  const writeConfigFile = (data: object): void => {
    fs.writeFileSync(globalConfigDir, JSON.stringify(data));
  };

  // write data in user config created
  const writeUserFile = (data: object): void => {
    fs.writeFileSync(userConfigDir, JSON.stringify(data));
  };

  beforeEach(() => {
    const { config } = require('../src/app/config-handler');

    globalConfigDir = createTempGlobalConfig(configFileName);
    userConfigDir = createTempUserConfig(configFileName);

    configInstance = config;
    jest.resetModules();
  });

  describe('getConfigFields', () => {
    it('should fail when field not present in either user or global config', () => {
      const fieldMock: string[] = ['no-url'];
      const globalConfig: object = { url: 'test' };
      const userConfig: object = { configVersion: '4.0.1' };

      // creating temp file
      writeConfigFile(globalConfig);
      writeUserFile(userConfig);

      // changing path from /Users/.../SymphonyElectron/config/Symphony.config to temp path
      configInstance.globalConfigPath = globalConfigDir;
      configInstance.userConfigPath = userConfigDir;
      configInstance.readGlobalConfig();
      configInstance.readUserConfig();

      const configField: IConfig = configInstance.getConfigFields(fieldMock);
      expect(configField).toEqual({});
    });

    it('should retrieve default values when field not present in either user or global config', () => {
      const fieldMock: string[] = [
        'isPodUrlEditable',
        'forceAutoUpdate',
        'enableBrowserLogin',
        'browserLoginAutoConnect',
        'latestAutoUpdateChannelEnabled',
        'betaAutoUpdateChannelEnabled',
        'browserLoginRetryTimeout',
        'openfin',
      ];
      const globalConfig: object = { url: 'test' };
      const userConfig: object = { configVersion: '4.0.1' };

      // creating temp file
      writeConfigFile(globalConfig);
      writeUserFile(userConfig);

      // changing path from /Users/.../SymphonyElectron/config/Symphony.config to temp path
      configInstance.globalConfigPath = globalConfigDir;
      configInstance.userConfigPath = userConfigDir;
      configInstance.readGlobalConfig();
      configInstance.readUserConfig();

      const configField: IConfig = configInstance.getConfigFields(fieldMock);
      expect(configField).toEqual({ ...ConfigFieldsDefaultValues });
    });

    it('should succeed when only present in user config', () => {
      const fieldMock: string[] = ['url'];
      const globalConfig: object = { url: 'something' };
      const userConfig: object = { configVersion: '4.0.1' };

      writeConfigFile(globalConfig);
      writeUserFile(userConfig);

      configInstance.globalConfigPath = globalConfigDir;
      configInstance.userConfigPath = userConfigDir;

      configInstance.readUserConfig();
      configInstance.readGlobalConfig();

      const configField: IGlobalConfig =
        configInstance.getGlobalConfigFields(fieldMock);

      expect(configField.url).toBe('something');
    });
  });

  describe('updateConfig', () => {
    it('should overwrite existing field', () => {
      const userConfig: object = { configVersion: '4.0.0' };
      const overwriteUserConfig: object = { configVersion: '4.0.1' };
      writeUserFile(userConfig);

      configInstance.userConfigPath = userConfigDir;
      configInstance.readUserConfig();

      configInstance.updateUserConfig(overwriteUserConfig);
      expect(configInstance.userConfig.configVersion).toBe('4.0.1');
    });

    it('should add new field', () => {
      const userConfig: object = { configVersion: '4.0.0' };
      const newValue: object = { test: 'test' };

      writeUserFile(userConfig);

      configInstance.userConfigPath = userConfigDir;
      configInstance.readUserConfig();

      configInstance.updateUserConfig(newValue);
      expect(configInstance.userConfig).toEqual({
        configVersion: '4.0.0',
        test: 'test',
      });
    });
  });

  describe('compareCloudConfig', () => {
    it('should return no updated fields for same objects', () => {
      const sdaCloudConfig: object = { configVersion: '4.0.0' };
      const sfeCloudConfig: object = { configVersion: '4.0.0' };
      const updatedFields = configInstance.compareCloudConfig(
        sdaCloudConfig,
        sfeCloudConfig,
      );

      expect(updatedFields.length).toBe(0);
    });

    it('should return no updated fields for empty object', () => {
      const sdaCloudConfig: object = { configVersion: '4.0.0' };
      const sfeCloudConfig: object = {};
      const updatedFields = configInstance.compareCloudConfig(
        sdaCloudConfig,
        sfeCloudConfig,
      );

      expect(updatedFields.length).toBe(0);
    });

    it('should return correct number of updated fields', () => {
      const sdaCloudConfig: object = {
        memoryThreshold: false,
        isCustomTitleBar: true,
      };
      const sfeCloudConfig: object = {
        memoryThreshold: true,
        isCustomTitleBar: true,
      };
      const updatedFields = configInstance.compareCloudConfig(
        sdaCloudConfig,
        sfeCloudConfig,
      );

      expect(updatedFields.length).toBe(1);
      expect(updatedFields[0]).toBe('memoryThreshold');
    });

    it('should compare nested object and return correct fields', () => {
      const sdaCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '*.symphony.com',
          authServerWhitelist: '',
        },
      };
      const sfeCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '*.symphony.com',
          authServerWhitelist: '',
        },
      };
      const updatedFields = configInstance.compareCloudConfig(
        sdaCloudConfig,
        sfeCloudConfig,
      );

      expect(updatedFields.length).toBe(0);
    });

    it('should return correct number of updated fields for nested object comparison', () => {
      const sdaCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '',
          authServerWhitelist: '',
        },
      };
      const sfeCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '*.symphony.com',
          authServerWhitelist: '',
        },
      };
      const updatedFields = configInstance.compareCloudConfig(
        sdaCloudConfig,
        sfeCloudConfig,
      );

      expect(updatedFields.length).toBe(1);
      expect(updatedFields[0]).toBe('customFlags');
    });

    it('should compare array and return correct fields', () => {
      const sdaCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '',
          authServerWhitelist: '',
        },
        ctWhitelist: [],
        podWhitelist: [],
      };
      const sfeCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '',
          authServerWhitelist: '',
        },
        ctWhitelist: [],
        podWhitelist: [],
      };
      const updatedFields = configInstance.compareCloudConfig(
        sdaCloudConfig,
        sfeCloudConfig,
      );

      expect(updatedFields.length).toBe(0);
    });

    it('should return correct number of updated fields for array comparison', () => {
      const sdaCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '',
          authServerWhitelist: '',
        },
        ctWhitelist: ['amulli'],
        podWhitelist: [],
      };
      const sfeCloudConfig: object = {
        memoryThreshold: false,
        customFlags: {
          authNegotiateDelegateWhitelist: '',
          authServerWhitelist: '',
        },
        ctWhitelist: [],
        podWhitelist: ['butti'],
      };
      const updatedFields = configInstance.compareCloudConfig(
        sdaCloudConfig,
        sfeCloudConfig,
      );

      expect(updatedFields.length).toBe(2);
      expect(updatedFields[0]).toBe('ctWhitelist');
      expect(updatedFields[1]).toBe('podWhitelist');
    });
  });
});
