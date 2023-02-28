import { nativeImage, WebContents } from 'electron';
import {
  EPresenceStatus,
  IPresenceStatus,
  IThumbarButton,
} from '../common/api-interface';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { presenceStatusStore } from './stores';
import { showBadgeCount, showSystemTrayPresence } from './window-utils';

export interface IListItem {
  name: string;
  event: string;
  dataTestId: string;
  onClick: (eventName: string) => Promise<void>;
}

class PresenceStatus {
  private NAMESPACE = 'PresenceStatus';

  public createThumbarButtons = (
    webContents: WebContents,
  ): IThumbarButton[] => {
    return [
      {
        click: () => {
          logger.info('presence-status-handler: Available Clicked');
          this.setPresenceStatus(webContents, EPresenceStatus.AVAILABLE);
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatus.AVAILABLE,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(EPresenceStatus.AVAILABLE, this.NAMESPACE)(),
      },
      {
        click: () => {
          logger.info('presence-status-handler: Busy Clicked');
          this.setPresenceStatus(webContents, EPresenceStatus.BUSY);
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatus.BUSY,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(EPresenceStatus.BUSY, this.NAMESPACE)(),
      },
      {
        click: () => {
          logger.info('presence-status-handler: Be Right Back Clicked');
          this.setPresenceStatus(webContents, EPresenceStatus.BE_RIGHT_BACK);
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatus.BE_RIGHT_BACK,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(EPresenceStatus.BE_RIGHT_BACK, this.NAMESPACE)(),
      },
      {
        click: () => {
          logger.info('presence-status-handler: Out of Office Clicked');
          this.setPresenceStatus(webContents, EPresenceStatus.OUT_OF_OFFICE);
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatus.OUT_OF_OFFICE,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(EPresenceStatus.OUT_OF_OFFICE, this.NAMESPACE)(),
      },
    ];
  };

  public setMyPresence = (myPresence: IPresenceStatus) => {
    const count = presenceStatusStore.getNotificationCount();

    presenceStatusStore.setStatus(myPresence.category);
    showBadgeCount(count);
    showSystemTrayPresence(myPresence.category);
  };

  private setPresenceStatus = (
    webContents: WebContents,
    status: EPresenceStatus,
  ) => {
    webContents.send('send-presence-status-data', status);
    presenceStatusStore.setStatus(status);
  };
}

const presenceStatus = new PresenceStatus();

export { presenceStatus };
