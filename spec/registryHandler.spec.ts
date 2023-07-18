import { retrieveWindowsRegistry } from '../src/app/registry-handler';
import {
  EChannelRegistry,
  RegistryStore,
} from '../src/app/stores/registry-store';

let mockChannel = { value: '', type: 'REG_SZ' };

jest.mock('winreg', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: (_file, callback) => callback(null, mockChannel),
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

describe('Windows Registry', () => {
  beforeEach(() => {
    jest.clearAllMocks().resetModules();
  });

  it('it should return channel - latest', async () => {
    mockChannel.value = 'latest';
    await retrieveWindowsRegistry();
    const registry = RegistryStore.getRegistry();
    expect(registry.currentChannel).toBe(EChannelRegistry.LATEST);
  });

  it('it should return channel - beta', async () => {
    mockChannel.value = 'beta';
    await retrieveWindowsRegistry();
    const registry = RegistryStore.getRegistry();
    expect(registry.currentChannel).toBe(EChannelRegistry.BETA);
  });
});
