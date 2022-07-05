import { connectC9Pipe } from '../src/app/c9-pipe-handler';
import { createConnection } from 'net';

jest.mock('net');

describe('C9 pipe handler', () => {
  const webContentsMocked = { send: jest.fn() };
  const mockConnectionEvents = new Map<String, any>();
  const mockCreateConnection = (createConnection as unknown) as jest.MockInstance<
    typeof createConnection
  >;

  beforeEach(() => {
    jest.clearAllMocks().resetModules();
    mockCreateConnection.mockImplementation((_path, onConnect: () => void) => {
      onConnect();
      return {
        on: (event, callback) => {
          mockConnectionEvents.set(event, callback);
        },
        destroy: jest.fn(),
      };
    });
  });

  describe('connect', () => {
    it('success', () => {
      connectC9Pipe(webContentsMocked as any, 'symphony-c9-test');
      expect(webContentsMocked.send).toHaveBeenCalledWith(
        'c9-pipe-event',
        expect.objectContaining({ event: 'connected' }),
      );
    });

    it('data', () => {
      connectC9Pipe(webContentsMocked as any, 'symphony-c9-test');
      mockConnectionEvents.get('data')('the data');
      expect(webContentsMocked.send).toHaveBeenCalledWith(
        'c9-pipe-event',
        expect.objectContaining({ event: 'data', arg: 'the data' }),
      );
    });
  });
});
