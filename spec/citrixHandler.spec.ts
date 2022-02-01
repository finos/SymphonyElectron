import {
  getCitrixMediaRedirectionStatus,
  RedirectionStatus,
} from '../src/app/citrix-handler';

let regKeyValue;

jest.mock('winreg', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: (_file, callback) => callback(null, regKeyValue),
    };
  });
});

jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: true,
    isLinux: false,
    isMac: false,
    isDevEnv: true,
  };
});

describe('citrix handler', () => {
  beforeEach(() => {
    jest.clearAllMocks().resetModules();
  });

  it('status inactive', async () => {
    regKeyValue = null;
    const status = await getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.INACTIVE);
  });

  it('should return supported when having the right registry with value 1', async () => {
    regKeyValue = { value: '0x01', type: 'REG_DWORD' };
    const status = await getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.SUPPORTED);
  });

  it('should return  unsupported when having the right registry with the wrong registry type', async () => {
    regKeyValue = { value: '0x01', type: 'REG_BINARY' };
    const status = await getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.UNSUPPORTED);
  });

  it('should return unsupported when finding the right registry with value 0 ', async () => {
    regKeyValue = { value: '0x00', type: 'REG_DWORD' };
    const status = await getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.UNSUPPORTED);
  });

  it('should return inactive on non windows Oses', async () => {
    jest.mock('../src/common/env', () => {
      return {
        isWindowsOS: false,
        isLinux: true,
        isMac: false,
      };
    });
    const {
      getCitrixMediaRedirectionStatus,
      RedirectionStatus,
    } = require('../src/app/citrix-handler');
    const status = await getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.INACTIVE);
  });
});
