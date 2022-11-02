describe('C9 shell handler', () => {
  const webContentsMocked = { send: jest.fn() };
  const mockSpawnEvents = new Map<String, any>();
  const mockSpawn = jest.fn();
  const mockGetCommandLineArgs = jest.fn();
  const mockGetGuid = jest.fn();
  const mockKill = jest.fn();
  let mockIsWindows: boolean;

  jest.mock('child_process', () => {
    return {
      spawn: mockSpawn,
      ChildProcess: () => {},
    };
  });

  jest.mock('../src/common/utils', () => {
    return {
      getCommandLineArgs: mockGetCommandLineArgs,
      getGuid: mockGetGuid,
    };
  });

  jest.mock('../src/common/env', () => {
    return {
      isDevEnv: false,
      isElectronQA: true,
      isMac: false,
      isWindowsOS: mockIsWindows,
      isLinux: false,
    };
  });

  beforeEach(() => {
    jest.clearAllMocks().resetModules().resetAllMocks();
    mockSpawnEvents.clear();
    mockSpawn.mockImplementation((_cmd, _args) => {
      return {
        on: (event, callback) => {
          mockSpawnEvents.set(event, callback);
        },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: mockKill,
      };
    });
    mockIsWindows = true;
  });

  describe('launch', () => {
    it('success', () => {
      const { loadC9Shell } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: { status: 'starting' },
      });

      mockSpawnEvents.get('spawn')();
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: expect.objectContaining({ status: 'active' }),
      });
    });

    it('failure', () => {
      const { loadC9Shell } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: { status: 'starting' },
      });

      mockSpawnEvents.get('close')(1);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: expect.objectContaining({ status: 'inactive' }),
      });
    });

    it('with attach', () => {
      mockGetCommandLineArgs.mockReturnValue('--c9pipe=custompipe');

      const { loadC9Shell } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: { status: 'active', pipeName: 'symphony-c9-custompipe' },
      });
    });

    it('cached status on relaunch', () => {
      const { loadC9Shell } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: { status: 'starting' },
      });

      mockSpawnEvents.get('spawn')();
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: expect.objectContaining({ status: 'active' }),
      });

      loadC9Shell(webContentsMocked as any);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: expect.objectContaining({ status: 'active' }),
      });
    });

    it('args', () => {
      mockGetGuid.mockReturnValue('just-another-guid');

      const { loadC9Shell } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(mockSpawn).toBeCalledWith(
        expect.stringContaining('c9shell.exe'),
        ['--symphonyHost', 'just-another-guid'],
        { stdio: 'pipe' },
      );
    });

    it('non-windows', () => {
      mockIsWindows = false;

      const { loadC9Shell } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(mockSpawn).not.toBeCalled();
    });
  });

  describe('terminate', () => {
    it('success', () => {
      const {
        loadC9Shell,
        terminateC9Shell,
      } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: { status: 'starting' },
      });

      terminateC9Shell(webContentsMocked as any);
      expect(mockKill).toBeCalledTimes(1);
    });

    it('no terminate if never started', () => {
      const { terminateC9Shell } = require('../src/app/c9-shell-handler');
      terminateC9Shell(webContentsMocked as any);
      expect(mockKill).toBeCalledTimes(0);
    });

    it('no terminate if already exited', () => {
      const {
        loadC9Shell,
        terminateC9Shell,
      } = require('../src/app/c9-shell-handler');
      loadC9Shell(webContentsMocked as any);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: { status: 'starting' },
      });

      mockSpawnEvents.get('close')(1);
      expect(webContentsMocked.send).lastCalledWith('c9-status-event', {
        status: expect.objectContaining({ status: 'inactive' }),
      });

      terminateC9Shell(webContentsMocked as any);
      expect(mockKill).toBeCalledTimes(0);
    });
  });
});
