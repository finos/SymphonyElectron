import * as ttlHandler from '../src/app/ttl-handler';

describe('ttl handler', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should return -1 for getExpiryTime', () => {
    expect(ttlHandler.getExpiryTime()).toBeDefined();
  });

  it('should return true if build is expired', () => {
    const expiryMock = jest.spyOn(ttlHandler, 'getExpiryTime');
    expiryMock.mockImplementation(() => Date.now() - 10 * 24 * 60);
    expect(ttlHandler.checkIfBuildExpired()).toBeTruthy();
  });

  it('should return false if build is valid', () => {
    const expiryMock = jest.spyOn(ttlHandler, 'getExpiryTime');
    expiryMock.mockImplementation(() => Date.now() + 10 * 24 * 60);
    expect(ttlHandler.checkIfBuildExpired()).toBeFalsy();
  });

  it('should return false if ttl is not applicable', () => {
    const expiryMock = jest.spyOn(ttlHandler, 'getExpiryTime');
    expiryMock.mockImplementation(() => -1);
    expect(ttlHandler.checkIfBuildExpired()).toBeFalsy();
  });
});
