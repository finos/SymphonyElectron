import { app, Menu, nativeImage, WebContents } from 'electron';
import {
  EPresenceStatus,
  IPresenceStatus,
  IThumbarButton,
} from '../common/api-interface';
import { i18n } from '../common/i18n';
import { logger } from '../common/logger';
import { presenceStatusStore } from './stores';
import { windowHandler } from './window-handler';
import { initSysTray, showBadgeCount } from './window-utils';

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
    const currentPresenceStatus = presenceStatusStore.getStatus();
    const count = presenceStatusStore.getNotificationCount();
    if (currentPresenceStatus !== myPresence.category) {
      presenceStatusStore.setStatus(myPresence.category);
      this.updateSystemTrayPresence();
    }
    showBadgeCount(count);
  };

  /**
   * Shows the badge count
   *
   * @param count {number}
   */
  public updateSystemTrayPresence = (): void => {
    const status = presenceStatusStore.getStatus();
    let tray = presenceStatusStore.getCurrentTray();
    const backgroundImage = presenceStatusStore.generateImagePath(
      status,
      'tray',
    );
    if (!backgroundImage) {
      return;
    }
    if (!tray) {
      tray = initSysTray();
      logger.info('presence-status-handler: create and save Symphony tray');
    } else {
      tray.setImage(backgroundImage);
      logger.info('presence-status-handler: new Symphony status updated');
    }
    const currentStatus = presenceStatusStore.getStatus();
    const presenceNamespace = 'PresenceStatus';
    const isMana = !!windowHandler.isMana;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: i18n.t('Status')(),
        visible: isMana,
        enabled: false,
      },
      {
        label: i18n.t(EPresenceStatus.AVAILABLE, presenceNamespace)(),
        type: 'checkbox',
        visible: isMana,
        checked: currentStatus === EPresenceStatus.AVAILABLE,
        click: () => {
          this.handlePresenceChange(EPresenceStatus.AVAILABLE);
        },
      },
      {
        label: i18n.t(EPresenceStatus.BUSY, presenceNamespace)(),
        type: 'checkbox',
        visible: isMana,
        checked: currentStatus === EPresenceStatus.BUSY,
        click: () => {
          this.handlePresenceChange(EPresenceStatus.BUSY);
        },
      },
      {
        label: i18n.t(EPresenceStatus.BE_RIGHT_BACK, presenceNamespace)(),
        type: 'checkbox',
        visible: isMana,
        checked: currentStatus === EPresenceStatus.BE_RIGHT_BACK,
        click: () => {
          this.handlePresenceChange(EPresenceStatus.BE_RIGHT_BACK);
        },
      },
      {
        label: i18n.t(EPresenceStatus.OUT_OF_OFFICE, presenceNamespace)(),
        type: 'checkbox',
        visible: isMana,
        checked: currentStatus === EPresenceStatus.OUT_OF_OFFICE,
        click: () => {
          this.handlePresenceChange(EPresenceStatus.OUT_OF_OFFICE);
        },
      },
      { type: 'separator', visible: isMana },
      {
        label: i18n.t('Quit Symphony')(),
        click: () => app.quit(),
      },
    ]);
    tray?.setContextMenu(contextMenu);
  };

  private handlePresenceChange = (currentStatus: EPresenceStatus) => {
    const status = {
      category: currentStatus,
      statusGroup: '',
      timestamp: Date.now(),
    };
    presenceStatus.setMyPresence(status);
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents) {
      mainWebContents.send('send-presence-status-data', currentStatus);
    }
  };

  private setPresenceStatus = (
    webContents: WebContents,
    status: EPresenceStatus,
  ) => {
    webContents.send('send-presence-status-data', status);
    presenceStatusStore.setStatus(status);
    this.updateSystemTrayPresence();
  };
}

const presenceStatus = new PresenceStatus();

export { presenceStatus };
