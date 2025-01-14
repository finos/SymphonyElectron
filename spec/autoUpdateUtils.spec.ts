import * as electronFetch from 'electron-fetch';
import { fetchLatestVersion } from '../src/app/auto-update-utils';
import { logger } from '../src/common/logger';

jest.mock('../src/common/logger');
jest.mock('electron-fetch');

const DEFAULT_VERSION_RESPONSE = `
version: 25.1.0-2514
files:
  - url: https://123.exe
    sha512: 123
    size: 206426857
path: https://123.exe
releaseDate: '2024-12-27T10:16:58.947Z'
sha512: 123`;

describe('fetchLatestVersion', () => {
  const mockUrl = 'test-url';
  const regex = /version: (.*)/;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the latest version from a URL', async () => {
    (
      electronFetch as jest.Mocked<typeof electronFetch>
    ).default.mockResolvedValueOnce({
      ok: true,
      text: async () => DEFAULT_VERSION_RESPONSE,
    });

    const version = await fetchLatestVersion(mockUrl, 5000, regex);
    expect(version).toBe('25.1.0-2514');
    expect(
      (electronFetch as jest.Mocked<typeof electronFetch>).default,
    ).toHaveBeenCalledWith(mockUrl, { signal: expect.anything() });
  });

  it('should return undefined if the fetch fails', async () => {
    (
      electronFetch as jest.Mocked<typeof electronFetch>
    ).default.mockRejectedValueOnce(new Error('Fetch error'));

    const version = await fetchLatestVersion(mockUrl, 5000, regex);
    expect(version).toBeUndefined();
    expect(
      (electronFetch as jest.Mocked<typeof electronFetch>).default,
    ).toHaveBeenCalledTimes(1);
  });

  it('should return undefined if the response is not ok', async () => {
    (
      electronFetch as jest.Mocked<typeof electronFetch>
    ).default.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });

    const version = await fetchLatestVersion(mockUrl, 5000, regex);
    expect(version).toBeUndefined();
  });

  it('should return undefined if the version is not found in the response', async () => {
    (
      electronFetch as jest.Mocked<typeof electronFetch>
    ).default.mockResolvedValueOnce({
      ok: true,
      text: async () => 'Invalid response',
    });

    const version = await fetchLatestVersion(mockUrl, 5000, regex);
    expect(version).toBeUndefined();
  });

  it('should handle timeout', async () => {
    const mockUrl = 'test-url';
    const autoUpdateTimeout = 10;

    jest.useFakeTimers();

    const versionPromise = fetchLatestVersion(
      mockUrl,
      autoUpdateTimeout,
      regex,
    );

    jest.advanceTimersByTime(autoUpdateTimeout + 1);

    const version = await versionPromise;

    expect(version).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'auto-update-handler: fetch aborted due to timeout',
      mockUrl,
    );

    jest.useRealTimers();
  });

  it('should handle error', async () => {
    const mockUrl = 'test-url';
    const autoUpdateTimeout = 100;

    jest.useFakeTimers();

    const versionPromise = fetchLatestVersion(
      mockUrl,
      autoUpdateTimeout,
      regex,
    );

    jest.advanceTimersByTime(autoUpdateTimeout - 1);

    const version = await versionPromise;

    expect(version).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'auto-update-handler: error fetching version',
      mockUrl,
      expect.anything(),
    );

    jest.useRealTimers();
  });
});
