import { app, Menu, nativeImage } from 'electron';
import {
  EPresenceStatusCategory,
  EPresenceStatusGroup,
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

  public createThumbarButtons = (): IThumbarButton[] => {
    return [
      {
        click: () => {
          logger.info('presence-status-handler: Available Clicked');
          this.handlePresenceChange(
            EPresenceStatusCategory.AVAILABLE,
            EPresenceStatusGroup.ONLINE,
          );
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatusGroup.ONLINE,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(EPresenceStatusCategory.AVAILABLE, this.NAMESPACE)(),
      },
      {
        click: () => {
          logger.info('presence-status-handler: Busy Clicked');
          this.handlePresenceChange(
            EPresenceStatusCategory.BUSY,
            EPresenceStatusGroup.BUSY,
          );
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatusGroup.BUSY,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(EPresenceStatusCategory.BUSY, this.NAMESPACE)(),
      },
      {
        click: () => {
          logger.info('presence-status-handler: Be Right Back Clicked');
          this.handlePresenceChange(
            EPresenceStatusCategory.BE_RIGHT_BACK,
            EPresenceStatusGroup.IDLE,
          );
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatusGroup.IDLE,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(
          EPresenceStatusCategory.BE_RIGHT_BACK,
          this.NAMESPACE,
        )(),
      },
      {
        click: () => {
          logger.info('presence-status-handler: Out of Office Clicked');
          this.handlePresenceChange(
            EPresenceStatusCategory.OUT_OF_OFFICE,
            EPresenceStatusGroup.ABSENT,
          );
        },
        icon: nativeImage.createFromPath(
          presenceStatusStore.generateImagePath(
            EPresenceStatusGroup.ABSENT,
            'thumbnail',
          ),
        ),
        tooltip: i18n.t(
          EPresenceStatusCategory.OUT_OF_OFFICE,
          this.NAMESPACE,
        )(),
      },
    ];
  };

  public setMyPresence = (myPresence: IPresenceStatus) => {
    const currentPresence = presenceStatusStore.getPresence();
    const count = presenceStatusStore.getNotificationCount();
    if (
      currentPresence.statusCategory !== myPresence.statusCategory ||
      currentPresence.statusGroup !== myPresence.statusGroup
    ) {
      presenceStatusStore.setPresence(myPresence);
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
    const presence = presenceStatusStore.getPresence();
    let tray = presenceStatusStore.getCurrentTray();
    const backgroundImage = presenceStatusStore.generateImagePath(
      presence.statusGroup,
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
    const presenceNamespace = 'PresenceStatus';
    const isMana = !!windowHandler.isMana;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: i18n.t('Status')(),
        visible: isMana,
        enabled: false,
      },
      {
        label: i18n.t(
          EPresenceStatusCategory.IN_A_MEETING,
          presenceNamespace,
        )(),
        type: 'checkbox',
        visible:
          isMana && presence.statusGroup === EPresenceStatusGroup.MEETING,
        checked: presence.statusGroup === EPresenceStatusGroup.MEETING,
      },
      {
        label: i18n.t(EPresenceStatusCategory.AVAILABLE, presenceNamespace)(),
        type: 'checkbox',
        visible:
          isMana && presence.statusGroup !== EPresenceStatusGroup.MEETING,
        checked: presence.statusGroup === EPresenceStatusGroup.ONLINE,
        click: () => {
          this.handlePresenceChange(
            EPresenceStatusCategory.AVAILABLE,
            EPresenceStatusGroup.ONLINE,
          );
        },
      },
      {
        label: i18n.t(EPresenceStatusCategory.BUSY, presenceNamespace)(),
        type: 'checkbox',
        visible: isMana,
        checked: presence.statusGroup === EPresenceStatusGroup.BUSY,
        click: () => {
          this.handlePresenceChange(
            EPresenceStatusCategory.BUSY,
            EPresenceStatusGroup.BUSY,
          );
        },
      },
      {
        label: i18n.t(
          EPresenceStatusCategory.BE_RIGHT_BACK,
          presenceNamespace,
        )(),
        type: 'checkbox',
        visible: isMana,
        checked: presence.statusGroup === EPresenceStatusGroup.IDLE,
        click: () => {
          this.handlePresenceChange(
            EPresenceStatusCategory.BE_RIGHT_BACK,
            EPresenceStatusGroup.IDLE,
          );
        },
      },
      {
        label: i18n.t(
          EPresenceStatusCategory.OUT_OF_OFFICE,
          presenceNamespace,
        )(),
        type: 'checkbox',
        visible: isMana,
        checked: presence.statusGroup === EPresenceStatusGroup.ABSENT,
        click: () => {
          this.handlePresenceChange(
            EPresenceStatusCategory.OUT_OF_OFFICE,
            EPresenceStatusGroup.ABSENT,
          );
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

  public onSignOut = () => {
    const offlinePresence: IPresenceStatus = {
      statusCategory: EPresenceStatusCategory.OFFLINE,
      statusGroup: EPresenceStatusGroup.HIDE_PRESENCE,
      timestamp: Date.now(),
    };
    presenceStatusStore.setNotificationCount(0);
    presenceStatusStore.setPresence(offlinePresence);
    showBadgeCount(0);
    const backgroundImage = presenceStatusStore.generateImagePath(
      offlinePresence.statusGroup,
      'tray',
    );
    const tray = presenceStatusStore.getCurrentTray();
    const contextDefault = Menu.buildFromTemplate([
      {
        label: i18n.t('Quit Symphony')(),
        click: () => app.quit(),
      },
    ]);
    tray?.setContextMenu(contextDefault);
    tray?.setImage(backgroundImage);
  };

  private handlePresenceChange = (
    statusCategory: EPresenceStatusCategory,
    statusGroup: EPresenceStatusGroup,
  ) => {
    const status: IPresenceStatus = {
      statusCategory,
      statusGroup,
      timestamp: Date.now(),
    };
    presenceStatus.setMyPresence(status);
    const mainWebContents = windowHandler.getMainWebContents();
    if (mainWebContents) {
      mainWebContents.send('send-presence-status-data', status.statusCategory);
    }
  };
}

const presenceStatus = new PresenceStatus();

export { presenceStatus };
