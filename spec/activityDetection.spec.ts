jest.mock('electron-log');

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      setIsAutoReload: jest.fn(() => true),
    },
  };
});

describe('activity detection', () => {
  const originalTimeout: number = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  let activityDetectionInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    // I did it for reset module imported between tests
    const { activityDetection } = require('../src/app/activity-detection');
    activityDetectionInstance = activityDetection;
  });

  afterAll((done) => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    done();
  });

  it('should call `setWindowAndThreshold` correctly', () => {
    // mocking startActivityMonitor
    const spy: jest.SpyInstance = jest.spyOn(
      activityDetectionInstance,
      'setWindowAndThreshold',
    );
    const idleThresholdMock: number = 1000;

    jest
      .spyOn(activityDetectionInstance, 'startActivityMonitor')
      .mockImplementation(() => jest.fn());

    activityDetectionInstance.setWindowAndThreshold({}, idleThresholdMock);

    expect(spy).toBeCalledWith({}, 1000);
  });

  it('should start activity monitor when `setWindowAndThreshold` is called', () => {
    const idleThresholdMock: number = 1000;
    const spy: jest.SpyInstance = jest
      .spyOn(activityDetectionInstance, 'startActivityMonitor')
      .mockImplementation(() => jest.fn());

    activityDetectionInstance.setWindowAndThreshold({}, idleThresholdMock);

    expect(spy).toBeCalled();
  });

  it('should call `activity` when `startActivityMonitor` is called', () => {
    const spy: jest.SpyInstance = jest.spyOn(
      activityDetectionInstance,
      'activity',
    );

    activityDetectionInstance.startActivityMonitor();

    jest.runOnlyPendingTimers();

    expect(spy).toBeCalled();
  });

  it('should call `sendActivity` when period was greater than idleTime', () => {
    // period is this.idleThreshold = 60 * 60 * 1000;
    const mockIdleTime: number = 50;
    const spy: jest.SpyInstance = jest.spyOn(
      activityDetectionInstance,
      'sendActivity',
    );
    const mockIdleTimeinMillis: number = mockIdleTime * 1000;

    activityDetectionInstance.activity(mockIdleTime);

    expect(spy).toBeCalledWith(mockIdleTimeinMillis);
  });
});
