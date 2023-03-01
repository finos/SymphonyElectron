import { nativeTheme, Tray } from 'electron';
import * as path from 'path';
import {
  EPresenceStatus,
  IStatusBadge,
  ITray,
} from '../../common/api-interface';
import { isMac, isWindowsOS } from '../../common/env';

// Flags can be read more here https://www.electronjs.org/docs/latest/api/browser-window#winsetthumbarbuttonsbuttons-windows

export class PresenceStatus {
  private presenceStatus: IStatusBadge = {
    status: EPresenceStatus.NO_PRESENCE,
    count: 0,
  };
  private tray: ITray = {
    current: null,
  };

  public setStatus = (status: EPresenceStatus) => {
    this.presenceStatus.status = status;
  };

  public setNotificationCount = (count: number) => {
    this.presenceStatus.count = count;
  };

  public getStatus = () => {
    return this.presenceStatus.status;
  };

  public getNotificationCount = () => {
    return this.presenceStatus.count;
  };

  public setCurrentTray = (tray: Tray) => (this.tray.current = tray);

  public getCurrentTray = () => this.tray.current;

  public destroyCurrentTray = () => {
    if (this.tray.current) {
      this.tray.current.removeAllListeners();
      this.tray.current.destroy();
      this.tray.current = null;
    }
  };

  public generateImagePath = (status: EPresenceStatus, place: string) => {
    let backgroundImage: string = '';
    const os = isWindowsOS ? 'windows' : isMac ? 'macOS' : 'linux';
    const theme = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
    const assetsPath = `src/renderer/assets/presence-status/${os}/${theme}`;
    let fileExtension = 'png';
    let iconPlace = '';
    switch (place) {
      case 'tray':
        iconPlace = '-tray';
        fileExtension = isWindowsOS ? 'ico' : isMac ? 'png' : 'png';
        break;
      case 'thumbnail':
        iconPlace = '-thumbnail';
        fileExtension = 'ico';
        break;
      default:
        break;
    }
    switch (status) {
      case EPresenceStatus.AVAILABLE:
        backgroundImage = `../../../${assetsPath}/${`available${iconPlace}.${fileExtension}`}`;
        break;

      case EPresenceStatus.BUSY:
        backgroundImage = `../../../${assetsPath}/busy${iconPlace}.${fileExtension}`;
        break;

      case EPresenceStatus.BE_RIGHT_BACK || EPresenceStatus.AWAY:
        backgroundImage = `../../../${assetsPath}/brb${iconPlace}.${fileExtension}`;
        break;

      case EPresenceStatus.OFFLINE:
        backgroundImage = `../../../${assetsPath}/offline${iconPlace}.${fileExtension}`;
        break;

      case EPresenceStatus.OUT_OF_OFFICE:
        backgroundImage = `../../../${assetsPath}/out-of-office${iconPlace}.${fileExtension}`;
        break;
      case EPresenceStatus.IN_A_MEETING:
        backgroundImage = `../../../${assetsPath}/in-a-meeting${iconPlace}.${fileExtension}`;
        break;
      case EPresenceStatus.NO_PRESENCE:
        backgroundImage = `../../../${assetsPath}/no-status${iconPlace}.${fileExtension}`;
        break;
      default:
        break;
    }

    return backgroundImage ? path.join(__dirname, backgroundImage) : '';
  };
}
