import { Tray } from 'electron';
import * as path from 'path';
import {
  EPresenceStatus,
  IStatusBadge,
  ITray,
} from '../../common/api-interface';

// Flags can be read more here https://www.electronjs.org/docs/latest/api/browser-window#winsetthumbarbuttonsbuttons-windows

export class PresenceStatus {
  private presenceStatus: IStatusBadge = {
    status: EPresenceStatus.AVAILABLE,
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

  public generateImagePath = (status: EPresenceStatus, place: string) => {
    let backgroundImage: string = '';
    const assetsPath = 'src/renderer/assets/presence-status';

    switch (status) {
      case EPresenceStatus.AVAILABLE:
        backgroundImage = `../../../${assetsPath}/${
          place === 'tray' ? 'online-tray.png' : 'online.png'
        }`;
        break;

      case EPresenceStatus.BUSY:
        backgroundImage = `../../../${assetsPath}/${
          place === 'tray' ? 'busy-tray.png' : 'busy.png'
        }`;
        break;

      case EPresenceStatus.BE_RIGHT_BACK || EPresenceStatus.AWAY:
        backgroundImage = `../../../${assetsPath}/${
          place === 'tray' ? 'brb-tray.png' : 'brb.png'
        }`;
        break;

      case EPresenceStatus.OFFLINE:
        backgroundImage = `../../../${assetsPath}/${
          place === 'tray' ? 'offline-tray.png' : 'offline.png'
        }`;
        break;

      case EPresenceStatus.OUT_OF_OFFICE:
        backgroundImage = `../../../${assetsPath}/${
          place === 'tray' ? 'out-of-office-tray.png' : 'out-of-office.png'
        }`;
        break;

      default:
        break;
    }

    return backgroundImage ? path.join(__dirname, backgroundImage) : '';
  };
}
