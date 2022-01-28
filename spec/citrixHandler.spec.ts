import { enumerateValues } from 'registry-js';
import { getCitrixMediaRedirectionStatus, RedirectionStatus } from '../src/app/citrix-handler';

jest.mock('registry-js');

jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: true,
    isLinux: false,
    isMac: false,
  };
});

describe('citrix handler', () => {
  const mockEnumerateValues = (enumerateValues as unknown) as jest.MockInstance<
    typeof enumerateValues
  >;

  beforeEach(() => {
    jest.clearAllMocks().resetModules();
  });

  it('status inactive', () => {
    mockEnumerateValues.mockReturnValue([
      {
        name: 'OtherValue',
        type: 'REG_SZ',
        data: 42,
      },
    ]);
    const status = getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.INACTIVE);
  });

  it('status supported', () => {
    mockEnumerateValues.mockReturnValue([
      {
        name: 'MSTeamsRedirectionSupport',
        type: 'REG_DWORD',
        data: 1,
      },
    ]);
    const status = getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.SUPPORTED);
  });

  it('status unsupported', () => {
    mockEnumerateValues.mockReturnValue([
      {
        name: 'MSTeamsRedirectionSupport',
        type: 'REG_DWORD',
        data: 0,
      },
    ]);
    const status = getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.UNSUPPORTED);
  });

  it('non-windows os', () => {
    jest.mock('../src/common/env', () => {
      return {
        isWindowsOS: false,
        isLinux: true,
        isMac: false,
      };
    });
    const { getCitrixMediaRedirectionStatus, RedirectionStatus } = require('../src/app/citrix-handler');
    const status = getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.INACTIVE);
    expect(mockEnumerateValues).not.toHaveBeenCalled();
  });
});
