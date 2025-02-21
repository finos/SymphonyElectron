import { openfinHandler } from '../src/app/openfin-handler';
import { connect } from '@openfin/node-adapter';

jest.mock('@openfin/node-adapter', () => ({
  connect: jest.fn(),
}));

(connect as jest.Mock).mockResolvedValue({
  Interop: {
    connectSync: jest.fn().mockReturnValue({
      onDisconnection: jest.fn(),
      fireIntent: jest.fn(),
      registerIntentHandler: jest.fn(),
      getAllClientsInContextGroup: jest.fn(),
      joinContextGroup: jest.fn(),
      joinSessionContextGroup: jest.fn(),
      getContextGroups: jest.fn(),
      fireIntentForContext: jest.fn(),
      removeFromContextGroup: jest.fn(),
    }),
  },
});

jest.mock('../src/app/config-handler', () => ({
  config: {
    getConfigFields: jest.fn(() => ({
      openfin: {
        uuid: 'mock-uuid',
        licenseKey: 'mock-license',
        runtimeVersion: 'mock-version',
        channelName: 'mock-channel',
        connectionTimeout: '10000',
      },
    })),
  },
}));

jest.mock('../src/app/window-handler', () => {
  return {
    windowHandler: {
      getMainWebContents: jest.fn(),
    },
  };
});

describe('Openfin', () => {
  let connectMock;
  beforeAll(async () => {
    connectMock = await connect({} as any);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not be connected', () => {
    const connectionStatus = openfinHandler.getConnectionStatus();

    expect(connectionStatus.isConnected).toBeFalsy();
  });

  it('should connect', async () => {
    const connectSyncSpy = jest.spyOn(connectMock.Interop, 'connectSync');

    await openfinHandler.connect();
    const connectionStatus = openfinHandler.getConnectionStatus();

    expect(connect).toHaveBeenCalled();
    expect(connectSyncSpy).toHaveBeenCalledTimes(1);
    expect(connectionStatus.isConnected).toBeTruthy();
  });

  it('should reject and return false if connection times out', async () => {
    jest.useFakeTimers();
    const connectSyncSpy = jest
      .spyOn(connectMock.Interop, 'connectSync')
      .mockImplementationOnce((_channelName) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 12000);
        });
      });

    const connectionTimeoutSpy = jest.spyOn(global, 'setTimeout');

    let connectionStatus;

    const connectPromise = openfinHandler.connect();
    const resultPromise = connectPromise.then((res) => {
      connectionStatus = res;
    });

    jest.advanceTimersByTime(10000);

    expect(connectionStatus).toBeUndefined();

    await resultPromise;

    expect(connectionStatus.isConnected).toBe(false);

    expect(connectionTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(connectionTimeoutSpy.mock.calls[0][1]).toBeGreaterThanOrEqual(10000);

    expect(connectSyncSpy).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('should reject and return false if connection times out', async () => {
    jest.useFakeTimers();
    const connectSyncSpy = jest
      .spyOn(connectMock.Interop, 'connectSync')
      .mockImplementationOnce((_channelName) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 12000);
        });
      });

    const connectionTimeoutSpy = jest.spyOn(global, 'setTimeout');

    let connectionStatus;

    const connectPromise = openfinHandler.connect();
    const resultPromise = connectPromise.then((res) => {
      connectionStatus = res;
    });

    jest.advanceTimersByTime(10000);

    expect(connectionStatus).toBeUndefined();

    await resultPromise;

    expect(connectionStatus.isConnected).toBe(false);

    expect(connectionTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(connectionTimeoutSpy.mock.calls[0][1]).toBeGreaterThanOrEqual(10000);

    expect(connectSyncSpy).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('should fire an intent', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const fireIntentSpy = jest.spyOn(connectSyncMock, 'fireIntent');

    await openfinHandler.connect();
    const customIntent = {
      name: 'ViewContact',
      context: {
        type: 'fdc3.contact',
        name: 'Andy Young',
        id: {
          email: 'andy.young@example.com',
        },
      },
    };
    await openfinHandler.fireIntent(customIntent);

    expect(fireIntentSpy).toHaveBeenCalledTimes(1);
  });

  it('should register an intent handler', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const intentHandlerRegistrationSpy = jest.spyOn(
      connectSyncMock,
      'registerIntentHandler',
    );

    await openfinHandler.connect();
    await openfinHandler.registerIntentHandler('my-intent');

    expect(intentHandlerRegistrationSpy).toHaveBeenCalledTimes(1);
  });

  it('should join a context group', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const joinContextGroupSpy = jest.spyOn(connectSyncMock, 'joinContextGroup');

    await openfinHandler.connect();
    await openfinHandler.joinContextGroup('contextGroupId');

    expect(joinContextGroupSpy).toHaveBeenCalledTimes(1);
  });

  it('should join a session context group', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const joinSessionContextGroupSpy = jest.spyOn(
      connectSyncMock,
      'joinSessionContextGroup',
    );

    await openfinHandler.connect();
    await openfinHandler.joinSessionContextGroup('contextGroupId');

    expect(joinSessionContextGroupSpy).toHaveBeenCalledTimes(1);
  });

  it('should return all context groups', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const getContextGroupsSpy = jest.spyOn(connectSyncMock, 'getContextGroups');

    await openfinHandler.connect();
    await openfinHandler.getContextGroups();

    expect(getContextGroupsSpy).toHaveBeenCalledTimes(1);
  });

  it('should return all clients in a given context group', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const getAllClientsInContextGroupSpy = jest.spyOn(
      connectSyncMock,
      'getAllClientsInContextGroup',
    );

    await openfinHandler.connect();
    await openfinHandler.getAllClientsInContextGroup('contextGroup1');

    expect(getAllClientsInContextGroupSpy).toHaveBeenCalledTimes(1);
  });

  it('should fire an intent for a given context', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const fireIntentForContextSpy = jest.spyOn(
      connectSyncMock,
      'fireIntentForContext',
    );

    await openfinHandler.connect();
    const context = {
      type: 'fdc3.contact',
      name: 'Andy Young',
      id: {
        email: 'andy.young@example.com',
      },
    };
    await openfinHandler.fireIntentForContext(context);

    expect(fireIntentForContextSpy).toHaveBeenCalledTimes(1);
  });

  it('should remove from context group', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const removeFromContextGroupSpy = jest.spyOn(
      connectSyncMock,
      'removeFromContextGroup',
    );

    await openfinHandler.removeFromContextGroup();

    expect(removeFromContextGroupSpy).toHaveBeenCalledTimes(1);
  });
});
