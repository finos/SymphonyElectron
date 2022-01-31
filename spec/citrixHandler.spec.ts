import {
  getCitrixMediaRedirectionStatus,
  RedirectionStatus,
} from '../src/app/citrix-handler';

const mockGetStringRegKey = jest.fn();
jest.mock(
  '@vscode/windows-registry',
  () => ({
    GetStringRegKey: mockGetStringRegKey,
  }),
  { virtual: true },
);

jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: true,
    isLinux: false,
    isMac: false,
  };
});

describe('citrix handler', () => {
  beforeEach(() => {
    jest.clearAllMocks().resetModules();
  });

  it('status inactive', () => {
    mockGetStringRegKey.mockImplementation(() => {
      throw 'Key not found';
    });
    const status = getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.INACTIVE);
  });

  it('status supported', () => {
    mockGetStringRegKey.mockReturnValue(String.fromCharCode(1));
    const status = getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.SUPPORTED);
  });

  it('status unsupported', () => {
    mockGetStringRegKey.mockReturnValue(String.fromCharCode(0));
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
    const {
      getCitrixMediaRedirectionStatus,
      RedirectionStatus,
    } = require('../src/app/citrix-handler');
    const status = getCitrixMediaRedirectionStatus();
    expect(status).toBe(RedirectionStatus.INACTIVE);
    expect(mockGetStringRegKey).not.toHaveBeenCalled();
  });
});
