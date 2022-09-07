import { Menu, MenuItem, MenuItemConstructorOptions } from 'electron';
import { isMac } from '../common/env';
import { ClientSwitchType, windowHandler } from './window-handler';
import { resetZoomLevel, zoomIn, zoomOut } from './window-utils';

export default class LocalMenuShortcuts {
  private menu: Menu;

  constructor() {
    this.menu = new Menu();
  }

  public buildShortcutMenu = () => {
    // Devtools shortcut
    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => windowHandler.onRegisterDevtools(),
        }),
      ),
    );
    // Reload shortcut
    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: 'CmdOrCtrl+R',
          click: () => windowHandler.onReload(),
        }),
      ),
    );
    // Export logs
    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: 'Ctrl+Shift+D',
          click: () => windowHandler.onExportLogs(),
        }),
      ),
    );

    if (
      windowHandler.url &&
      windowHandler.url.startsWith('https://corporate.symphony.com')
    ) {
      this.menu.append(
        new MenuItem({
          accelerator: isMac ? 'Cmd+Alt+1' : 'Ctrl+Shift+1',
          click: () => windowHandler.switchClient(ClientSwitchType.CLIENT_1_5),
        }),
      );
      this.menu.append(
        new MenuItem({
          accelerator: isMac ? 'Cmd+Alt+2' : 'Ctrl+Shift+2',
          click: () => windowHandler.switchClient(ClientSwitchType.CLIENT_2_0),
        }),
      );
      this.menu.append(
        new MenuItem(
          this.getMenuItemOptions({
            accelerator: isMac ? 'Cmd+Alt+3' : 'Ctrl+Shift+3',
            click: () =>
              windowHandler.switchClient(ClientSwitchType.CLIENT_2_0_DAILY),
          }),
        ),
      );
    }

    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: 'CmdOrCtrl+=',
          click: () => zoomIn(),
        }),
      ),
    );
    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: 'CmdOrCtrl+-',
          click: () => zoomOut(),
        }),
      ),
    );

    if (isMac) {
      this.menu.append(
        new MenuItem(
          this.getMenuItemOptions({
            accelerator: 'CmdOrCtrl+Plus',
            click: () => zoomIn(),
          }),
        ),
      );
    } else {
      this.menu.append(
        new MenuItem(
          this.getMenuItemOptions({
            accelerator: 'Ctrl+=',
            click: () => zoomIn(),
          }),
        ),
      );
      this.menu.append(
        new MenuItem(
          this.getMenuItemOptions({
            accelerator: 'Ctrl+=',
            click: () => zoomIn(),
          }),
        ),
      );
      this.menu.append(
        new MenuItem(
          this.getMenuItemOptions({
            accelerator: 'Ctrl+numadd',
            click: () => zoomIn(),
          }),
        ),
      );
      this.menu.append(
        new MenuItem(
          this.getMenuItemOptions({
            accelerator: 'Ctrl+numsub',
            click: () => zoomOut(),
          }),
        ),
      );
      this.menu.append(
        new MenuItem(
          this.getMenuItemOptions({
            accelerator: 'Ctrl+num0',
            click: () => resetZoomLevel(),
          }),
        ),
      );
    }

    Menu.setApplicationMenu(this.menu);
  };

  private getMenuItemOptions = (opts): MenuItemConstructorOptions => {
    return {
      ...{
        visible: false,
        acceleratorWorksWhenHidden: true,
      },
      ...opts,
    };
  };
}
