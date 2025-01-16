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
      getContextGroups: jest.fn(),
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

  it('should not be connected', () => {
    const info = openfinHandler.getInfo();
    const isConnected = openfinHandler.getConnectionStatus();

    expect(info.isConnected).toBeFalsy();
    expect(isConnected).toBeFalsy();
  });

  it('should connect', async () => {
    const connectSyncSpy = jest.spyOn(connectMock.Interop, 'connectSync');

    await openfinHandler.connect();
    const info = openfinHandler.getInfo();
    const isConnected = openfinHandler.getConnectionStatus();

    expect(connect).toHaveBeenCalled();
    expect(connectSyncSpy).toHaveBeenCalledTimes(1);
    expect(info.isConnected).toBeTruthy();
    expect(isConnected).toBeTruthy();
  });

  it('should fire an intent', async () => {
    const connectSyncMock = await connectMock.Interop.connectSync();
    const fireIntentSpy = jest.spyOn(connectSyncMock, 'fireIntent');

    await openfinHandler.connect();
    const customIntent = {
      type: 'fdc3.contact',
      name: 'Andy Young',
      id: {
        email: 'andy.young@example.com',
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
});
