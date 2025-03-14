import { config } from '../src/app/config-handler';
import { mainEvents } from '../src/app/main-event-handler';
import {
  DEFAULT_MINI_VIEW_WINDOW_WIDTH,
  MINI_VIEW_THRESHOLD_WINDOW_WIDTH,
  miniViewHandler,
} from '../src/app/mini-view-handler';
import { windowHandler } from '../src/app/window-handler';

jest.mock('../src/app/config-handler', () => ({
  config: {
    getUserConfigFields: jest.fn(),
    updateUserConfig: jest.fn(),
  },
}));

jest.mock('../src/app/main-event-handler', () => ({
  mainEvents: {
    publish: jest.fn(),
  },
}));

jest.mock('../src/app/window-handler', () => ({
  windowHandler: {
    getMainWindow: jest.fn(),
    getMainWebContents: jest.fn(),
    setIsMiniViewEnabled: jest.fn(),
    setIsMiniViewFeatureEnabled: jest.fn(),
    setIsMiniViewTransition: jest.fn(),
    getIsMiniViewTransition: jest.fn(),
  },
}));

jest.mock('../src/app/window-utils', () => {
  return {
    windowExists: jest.fn(() => true),
  };
});

describe('MiniViewHandler', () => {
  let mockMainWindow: any;
  let mockMainWebContents: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMainWindow = {
      setBounds: jest.fn(),
      getSize: jest.fn(() => [800, 600]),
      isFullScreen: jest.fn(() => false),
      isMaximized: jest.fn(() => false),
      setFullScreen: jest.fn(),
      unmaximize: jest.fn(),
      setSize: jest.fn(),
      setAlwaysOnTop: jest.fn(),
    };

    mockMainWebContents = {
      send: jest.fn(),
      isDestroyed: jest.fn(() => false),
    };

    (windowHandler.getMainWindow as jest.Mock).mockReturnValue(mockMainWindow);
    (windowHandler.getMainWebContents as jest.Mock).mockReturnValue(
      mockMainWebContents,
    );
    (windowHandler.setIsMiniViewTransition as jest.Mock).mockImplementation();
    (windowHandler.getIsMiniViewTransition as jest.Mock).mockImplementation(
      () => false,
    );
    (config.getUserConfigFields as jest.Mock).mockReturnValue({});
    (config.updateUserConfig as jest.Mock).mockResolvedValue(undefined);
  });

  describe('activateMiniView', () => {
    it('should set correct bounds when mainWinPosInMiniView exists', () => {
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: { x: 10, y: 20, width: 500, height: 400 },
      });

      miniViewHandler.activateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 10,
        y: 20,
        width: 500,
        height: 400,
      });
    });

    it('should set default width and preserve height when mainWinPosInMiniView does not exist or has width > DEFAULT_MINI_VIEW_WINDOW_WIDTH', () => {
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: { x: 10, y: 20, width: 700, height: 400 },
      });
      miniViewHandler.activateMiniView();

      expect(mockMainWindow.setSize).toHaveBeenCalledWith(
        DEFAULT_MINI_VIEW_WINDOW_WIDTH,
        600,
      );
    });

    it('should call setIsMiniViewTransition and notifyClient with true', (done) => {
      jest.useFakeTimers();
      miniViewHandler.activateMiniView();

      expect(windowHandler.setIsMiniViewTransition).toHaveBeenLastCalledWith(
        true,
      );

      jest.runAllTimers();
      expect(windowHandler.setIsMiniViewTransition).toHaveBeenLastCalledWith(
        false,
      );
      expect(mockMainWebContents.send).toHaveBeenCalledWith(
        'set-mini-view',
        true,
      );
      done();
    });

    it('should set fullscreen to false if currently is in fullscreen', () => {
      (mockMainWindow.isFullScreen as jest.Mock).mockReturnValue(true);
      miniViewHandler.activateMiniView();
      expect(mockMainWindow.setFullScreen).toHaveBeenCalledWith(false);
    });

    it('should call unmaximize if currently is maximized', () => {
      (mockMainWindow.isMaximized as jest.Mock).mockReturnValue(true);
      miniViewHandler.activateMiniView();
      expect(mockMainWindow.unmaximize).toHaveBeenCalled();
      expect(mainEvents.publish).toHaveBeenCalledWith('unmaximize');
    });
  });

  describe('deactivateMiniView', () => {
    it('should set correct bounds when mainWinPos exists and width > MINI_VIEW_THRESHOLD_WINDOW_WIDTH', () => {
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPos: { x: 10, y: 20, width: 800, height: 400 },
      });

      miniViewHandler.deactivateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 10,
        y: 20,
        width: 800,
        height: 400,
      });
    });

    it('should set default width and preserve height when mainWinPos does not exist or has width <= MINI_VIEW_THRESHOLD_WINDOW_WIDTH', () => {
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPos: { x: 10, y: 20, width: 600, height: 400 },
      });
      miniViewHandler.deactivateMiniView();

      expect(mockMainWindow.setSize).toHaveBeenCalledWith(
        MINI_VIEW_THRESHOLD_WINDOW_WIDTH,
        600,
      );
    });

    it('should call setIsMiniViewTransition and notifyClient with false', (done) => {
      jest.useFakeTimers();
      miniViewHandler.deactivateMiniView();

      expect(windowHandler.setIsMiniViewTransition).toHaveBeenLastCalledWith(
        true,
      );
      jest.runAllTimers();
      expect(windowHandler.setIsMiniViewTransition).toHaveBeenLastCalledWith(
        false,
      );
      expect(mockMainWebContents.send).toHaveBeenCalledWith(
        'set-mini-view',
        false,
      );
      done();
    });
  });

  describe('notifyClient', () => {
    it('should send set-mini-view message to main web contents', () => {
      miniViewHandler.notifyClient(true);

      expect(mockMainWebContents.send).toHaveBeenCalledWith(
        'set-mini-view',
        true,
      );

      miniViewHandler.notifyClient(false);
      expect(mockMainWebContents.send).toHaveBeenCalledWith(
        'set-mini-view',
        false,
      );
    });

    it('should not send set-mini-view message if main web contents is destroyed', () => {
      (mockMainWebContents.isDestroyed as jest.Mock).mockReturnValue(true);

      miniViewHandler.notifyClient(true);

      expect(mockMainWebContents.send).not.toHaveBeenCalled();
    });
  });
});
