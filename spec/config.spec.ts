import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IConfig } from '../src/app/config-handler';

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

            const configField: IConfig = configInstance.getConfigFields(fieldMock);

            expect(configField.url).toBe('something');
        });

        it('should fail when config path is invalid', () => {
            const userConfig: object = { url: 'test' };
            let isInvalidPath: boolean = false;
            writeConfigFile(userConfig);

            configInstance.globalConfigPath = '//';
            try {
                configInstance.readGlobalConfig();
            } catch (e) {
                isInvalidPath = true;
            }
            expect(isInvalidPath).toBeTruthy();
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
            expect(configInstance.userConfig).toEqual({ configVersion: '4.0.0', test: 'test' });
        });

        it('should fail when invalid path is used', () => {
            configInstance.userConfigPath = '//';

            return expect(configInstance.readUserConfig()).rejects.toBeTruthy();
        });
    });
});
