import { nativeTheme, Tray } from 'electron';
import * as path from 'path';
import {
  EPresenceStatusCategory,
  EPresenceStatusGroup,
  IPresenceStatus,
  IStatusBadge,
  ITray,
} from '../../common/api-interface';
import { isMac, isWindowsOS } from '../../common/env';

// Flags can be read more here https://www.electronjs.org/docs/latest/api/browser-window#winsetthumbarbuttonsbuttons-windows

export class PresenceStatus {
  private presenceStatus: IStatusBadge = {
    statusCategory: EPresenceStatusCategory.NO_PRESENCE,
    statusGroup: EPresenceStatusGroup.OFFLINE,
    count: 0,
  };
  private tray: ITray = {
    current: null,
  };

  public setPresence = (presence: IPresenceStatus) => {
    this.presenceStatus.statusCategory = presence.statusCategory;
    this.presenceStatus.statusGroup = presence.statusGroup;
  };

  public setNotificationCount = (count: number) => {
    this.presenceStatus.count = count;
  };

  public getPresence = () => {
    return this.presenceStatus;
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

  public generateImagePath = (
    statusGroup: EPresenceStatusGroup,
    place: string,
  ) => {
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
    switch (statusGroup) {
      case EPresenceStatusGroup.ONLINE:
        backgroundImage = `../../../${assetsPath}/${`available${iconPlace}.${fileExtension}`}`;
        break;

      case EPresenceStatusGroup.BUSY:
        backgroundImage = `../../../${assetsPath}/busy${iconPlace}.${fileExtension}`;
        break;

      case EPresenceStatusGroup.IDLE:
        backgroundImage = `../../../${assetsPath}/brb${iconPlace}.${fileExtension}`;
        break;

      case EPresenceStatusGroup.OFFLINE:
        backgroundImage = `../../../${assetsPath}/offline${iconPlace}.${fileExtension}`;
        break;

      case EPresenceStatusGroup.ABSENT:
        backgroundImage = `../../../${assetsPath}/out-of-office${iconPlace}.${fileExtension}`;
        break;
      case EPresenceStatusGroup.MEETING:
        backgroundImage = `../../../${assetsPath}/in-a-meeting${iconPlace}.${fileExtension}`;
        break;
      case EPresenceStatusGroup.HIDE_PRESENCE:
        backgroundImage = `../../../${assetsPath}/no-status${iconPlace}.${fileExtension}`;
        break;
      default:
        break;
    }

    return backgroundImage ? path.join(__dirname, backgroundImage) : '';
  };
}
