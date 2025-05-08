import { Display, Rectangle } from 'electron';
import { config } from '../src/app/config-handler';
import { mainEvents } from '../src/app/main-event-handler';
import {
  DEFAULT_MINI_VIEW_WINDOW_WIDTH,
  MINI_VIEW_THRESHOLD_WINDOW_WIDTH,
  miniViewHandler,
} from '../src/app/mini-view-handler';
import { windowHandler } from '../src/app/window-handler';
import { screen } from './__mocks__/electron';

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
    isValidBounds: jest.fn(() => true),
  };
});

jest.mock('electron');

describe('MiniViewHandler', () => {
  let mockMainWindow: any;
  let mockMainWebContents: any;
  let mockDisplay: Partial<Display>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMainWindow = {
      setBounds: jest.fn(),
      getBounds: jest.fn(),
      getSize: jest.fn(() => [800, 600]),
      isFullScreen: jest.fn(() => false),
      isMaximized: jest.fn(() => false),
      setFullScreen: jest.fn(),
      unmaximize: jest.fn(),
      setSize: jest.fn(),
      setAlwaysOnTop: jest.fn(),
      once: jest.fn(),
    };

    mockDisplay = {
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      size: { width: 1920, height: 1080 },
      workAreaSize: { width: 1920, height: 1080 },
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
    (screen.getDisplayMatching as jest.Mock).mockReturnValue(mockDisplay);
  });

  describe('constrainBoundsToCurrentDisplay', () => {
    it('should constrain bounds within the current display', async () => {
      const bounds: Rectangle = { x: -100, y: -50, width: 500, height: 400 };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: bounds,
      });
      await miniViewHandler.activateMiniView();
      expect(mockMainWindow.setBounds).toHaveBeenCalledWith(
        expect.objectContaining({ x: 0, y: 0 }),
      );
    });

    it('should not modify bounds if already within the display', async () => {
      const bounds: Rectangle = { x: 100, y: 50, width: 500, height: 400 };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: bounds,
      });
      await miniViewHandler.activateMiniView();
      expect(mockMainWindow.setBounds).toHaveBeenCalledWith(
        expect.objectContaining(bounds),
      );
    });

    it('should handle bounds exceeding display width', async () => {
      const bounds: Rectangle = { x: 1800, y: 100, width: 500, height: 400 };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: bounds,
      });
      await miniViewHandler.activateMiniView();
      expect(mockMainWindow.setBounds).toHaveBeenCalledWith(
        expect.objectContaining({ x: 1420 }),
      );
    });

    it('should handle bounds exceeding display height', async () => {
      const bounds: Rectangle = { x: 100, y: 900, width: 500, height: 400 };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: bounds,
      });
      await miniViewHandler.activateMiniView();
      expect(mockMainWindow.setBounds).toHaveBeenCalledWith(
        expect.objectContaining({ y: 680 }),
      );
    });
  });

  describe('activateMiniView', () => {
    const validBounds: Rectangle = {
      x: 10,
      y: 20,
      width: 600,
      height: 600,
    };

    const invalidBounds = {
      x: 100,
      y: 100,
    };

    it('should set correct bounds when mainWinPosInMiniView exists', async () => {
      (screen.getDisplayMatching as jest.Mock).mockReturnValue(mockDisplay);
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: validBounds,
      });

      await miniViewHandler.activateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith(validBounds);
    });

    it('should use primary display when saved bounds are invalid', async () => {
      (screen.getDisplayMatching as jest.Mock).mockReturnValue({});
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: invalidBounds,
      });

      await miniViewHandler.activateMiniView();

      expect(mockMainWindow.setSize).toHaveBeenCalledWith(
        DEFAULT_MINI_VIEW_WINDOW_WIDTH,
        600,
      );
    });

    it('should set default width and preserve height when mainWinPosInMiniView does not exist or has width > DEFAULT_MINI_VIEW_WINDOW_WIDTH', async () => {
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: { x: 10, y: 20, width: 700, height: 400 },
      });
      await miniViewHandler.activateMiniView();

      expect(mockMainWindow.setSize).toHaveBeenCalledWith(
        DEFAULT_MINI_VIEW_WINDOW_WIDTH,
        600,
      );
    });

    it('should call setIsMiniViewTransition and notifyClient with true', (done) => {
      jest.useFakeTimers();
      miniViewHandler.activateMiniView().then(() => {
        expect(windowHandler.setIsMiniViewTransition).toHaveBeenLastCalledWith(
          false,
        );
        expect(mockMainWebContents.send).toHaveBeenCalledWith(
          'set-mini-view',
          true,
        );
        done();
      });
      expect(windowHandler.setIsMiniViewTransition).toHaveBeenLastCalledWith(
        true,
      );
      jest.runAllTimers();
    });

    it('should set fullscreen to false if currently is in fullscreen', async () => {
      jest.useFakeTimers();
      (mockMainWindow.isFullScreen as jest.Mock).mockReturnValue(true);
      (mockMainWindow.once as jest.Mock).mockImplementation(
        (event, callback) => {
          if (event === 'leave-full-screen') {
            callback();
            jest.runAllTimers();
          }
        },
      );
      await miniViewHandler.activateMiniView();
      expect(mockMainWindow.setFullScreen).toHaveBeenCalledWith(false);
      expect(mockMainWindow.once).toHaveBeenCalledWith(
        'leave-full-screen',
        expect.any(Function),
      );
    });

    it('should call unmaximize if currently is maximized', async () => {
      jest.useFakeTimers();
      (mockMainWindow.isMaximized as jest.Mock).mockReturnValue(true);
      await miniViewHandler.activateMiniView();
      jest.runAllTimers();
      expect(mockMainWindow.unmaximize).toHaveBeenCalled();
      expect(mainEvents.publish).toHaveBeenCalledWith('unmaximize');
    });

    it('should constrain bounds to current display when activating mini view with out-of-bounds position - top-left', async () => {
      const outOfBounds: Rectangle = {
        x: -100,
        y: -50,
        width: 500,
        height: 400,
      };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: outOfBounds,
      });

      await miniViewHandler.activateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 0,
        y: 0,
        width: 500,
        height: 400,
      });
    });

    it('should constrain bounds to current display when activating mini view with out-of-bounds position - bottom-right', async () => {
      const outOfBounds: Rectangle = {
        x: 1800,
        y: 900,
        width: 500,
        height: 400,
      };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: outOfBounds,
      });

      await miniViewHandler.activateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 1420,
        y: 680,
        width: 500,
        height: 400,
      });
    });

    it('should constrain bounds to current display when activating mini view with out-of-bounds position - partially out', async () => {
      const outOfBounds: Rectangle = {
        x: -50,
        y: -25,
        width: 600,
        height: 500,
      };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: outOfBounds,
      });

      await miniViewHandler.activateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 0,
        y: 0,
        width: 600,
        height: 500,
      });
    });
  });

  describe('deactivateMiniView', () => {
    const invalidBounds = {
      x: 100,
      y: 100,
    };

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

    it('should use primary display when saved bounds are invalid', async () => {
      (screen.getDisplayMatching as jest.Mock).mockReturnValue({});
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPosInMiniView: invalidBounds,
      });

      await miniViewHandler.deactivateMiniView();

      expect(mockMainWindow.setSize).toHaveBeenCalledWith(
        MINI_VIEW_THRESHOLD_WINDOW_WIDTH,
        600,
      );
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

    it('should constrain bounds to current display when deactivating mini view with out-of-bounds position - top-left', async () => {
      const outOfBounds: Rectangle = {
        x: -100,
        y: -50,
        width: 800,
        height: 600,
      };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPos: outOfBounds,
      });

      await miniViewHandler.deactivateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
    });

    it('should constrain bounds to current display when deactivating mini view with out-of-bounds position - bottom-right', async () => {
      const outOfBounds: Rectangle = {
        x: 1800,
        y: 900,
        width: 800,
        height: 600,
      };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPos: outOfBounds,
      });

      await miniViewHandler.deactivateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 1120,
        y: 480,
        width: 800,
        height: 600,
      });
    });

    it('should constrain bounds to current display when deactivating mini view with out-of-bounds position - partially out', async () => {
      const outOfBounds: Rectangle = {
        x: -50,
        y: -25,
        width: 900,
        height: 700,
      };
      (config.getUserConfigFields as jest.Mock).mockReturnValue({
        mainWinPos: outOfBounds,
      });

      await miniViewHandler.deactivateMiniView();

      expect(mockMainWindow.setBounds).toHaveBeenCalledWith({
        x: 0,
        y: 0,
        width: 900,
        height: 700,
      });
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
