import { Menu, MenuItem, MenuItemConstructorOptions } from 'electron';
import { isMac } from '../common/env';
import { windowHandler } from './window-handler';
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
          accelerator: 'CmdOrCtrl+0',
          click: () => resetZoomLevel(),
        }),
      ),
    );
    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        }),
      ),
    );
    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        }),
      ),
    );
    this.menu.append(
      new MenuItem(
        this.getMenuItemOptions({
          accelerator: 'F11',
          role: 'togglefullscreen',
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
