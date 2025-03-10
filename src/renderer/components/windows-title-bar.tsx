import {
  Dismiss12Filled,
  LineHorizontal1Filled,
  LineHorizontal3Filled,
  Maximize16Filled,
  SquareMultiple16Regular,
} from '@fluentui/react-icons';
import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';

interface IState {
  title: string;
  isMaximized: boolean;
  isDisabled: boolean;
  isMiniViewFeatureEnabled: boolean;
  isMiniViewEnabled: boolean;
}

const TITLE_BAR_NAMESPACE = 'TitleBar';

export default class WindowsTitleBar extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onClose: () => this.close(),
    onMaximize: () => this.maximize(),
    onMinimize: () => this.minimize(),
    onShowMenu: () => this.showMenu(),
    onUnmaximize: () => this.unmaximize(),
    onExitMiniView: () => this.onExitMiniView(),
    onEnterMiniView: () => this.onEnterMiniView(),
    onDisableContextMenu: (event) => this.disableContextMenu(event),
  };
  private observer: MutationObserver | undefined;

  constructor(props) {
    super(props);
    this.state = {
      title: document.title || i18n.t('Symphony Messaging')(),
      isMaximized: false,
      isDisabled: false,
      isMiniViewFeatureEnabled: false,
      isMiniViewEnabled: false,
    };
    // Adds borders to the window
    this.addWindowBorders();

    this.renderMaximizeButtons = this.renderMaximizeButtons.bind(this);
    // Event to capture and update icons
    ipcRenderer.on('maximize', () => this.updateState({ isMaximized: true }));
    ipcRenderer.on('unmaximize', () =>
      this.updateState({ isMaximized: false }),
    );
    ipcRenderer.on('move', (_event, isMaximized) => {
      this.updateState({ isMaximized });
    });

    ipcRenderer.once('disable-action-button', () => {
      this.updateState({ isDisabled: true });
    });

    ipcRenderer.on(
      'on-mini-view-feature',
      (_event, [isMiniViewFeatureEnabled]) => {
        this.updateState({ isMiniViewFeatureEnabled });
      },
    );

    ipcRenderer.on('on-mini-view', (_event, [isMiniViewEnabled]) => {
      this.updateState({ isMiniViewEnabled });
    });
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    const target = document.querySelector('title');
    this.observer = new MutationObserver((mutations) => {
      const title: string = mutations[0].target.textContent
        ? mutations[0].target.textContent
        : i18n.t('Symphony Messaging')();
      this.setState({ title });
    });
    if (target) {
      this.observer.observe(target, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  /**
   * Callback to handle event when a component is unmounted
   */
  public componentWillUnmount(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Renders the component
   */
  public render(): JSX.Element | null {
    const { title, isMiniViewFeatureEnabled } = this.state;

    return (
      <div
        id='title-bar'
        onDoubleClick={
          this.state.isMaximized
            ? this.eventHandlers.onUnmaximize
            : this.eventHandlers.onMaximize
        }
      >
        <div className='title-bar-button-container'>
          <button
            title={i18n.t('Menu', TITLE_BAR_NAMESPACE)()}
            className='hamburger-menu-button'
            onClick={this.eventHandlers.onShowMenu}
            onContextMenu={this.eventHandlers.onDisableContextMenu}
            onMouseDown={this.handleMouseDown}
          >
            <LineHorizontal3Filled fontSize={'16px'} />
          </button>
        </div>
        <div className='title-container'>
          <img
            className='symphony-messaging-logo'
            alt={'Symphony Messaging Logo'}
            src={'../renderer/assets/title-bar-symphony-icon.svg'}
          />
          {!this.state.isMiniViewEnabled && <p id='title-bar-title'>{title}</p>}
        </div>
        {isMiniViewFeatureEnabled && (
          <div className='title-bar-button-container'>
            {this.getMiniViewButton()}
          </div>
        )}
        <div className='title-bar-button-container'>
          <button
            className='title-bar-button'
            title={i18n.t('Minimize', TITLE_BAR_NAMESPACE)()}
            onClick={this.eventHandlers.onMinimize}
            onContextMenu={this.eventHandlers.onDisableContextMenu}
            onMouseDown={this.handleMouseDown}
          >
            <LineHorizontal1Filled />
          </button>
        </div>
        <div className='title-bar-button-container'>
          {this.renderMaximizeButtons()}
        </div>
        <div className='title-bar-button-container'>
          <button
            className='title-bar-button close'
            title={i18n.t('Close', TITLE_BAR_NAMESPACE)()}
            onClick={this.eventHandlers.onClose}
            onContextMenu={this.eventHandlers.onDisableContextMenu}
            onMouseDown={this.handleMouseDown}
          >
            <Dismiss12Filled />
          </button>
        </div>
        <div className='branding-logo' />
      </div>
    );
  }

  /**
   * Renders maximize or minimize buttons based on fullscreen state
   */
  public renderMaximizeButtons(): JSX.Element {
    const { isMaximized, isDisabled } = this.state;

    if (isMaximized) {
      return (
        <button
          className='title-bar-button'
          title={i18n.t('Restore', TITLE_BAR_NAMESPACE)()}
          onClick={this.eventHandlers.onUnmaximize}
          onContextMenu={this.eventHandlers.onDisableContextMenu}
          onMouseDown={this.handleMouseDown}
        >
          <SquareMultiple16Regular
            className={classNames({ disabled: isDisabled })}
          />
        </button>
      );
    }
    return (
      <button
        className='title-bar-button'
        title={i18n.t('Maximize', TITLE_BAR_NAMESPACE)()}
        onClick={this.eventHandlers.onMaximize}
        onContextMenu={this.eventHandlers.onDisableContextMenu}
        onMouseDown={this.handleMouseDown}
      >
        <Maximize16Filled className={classNames({ disabled: isDisabled })} />
      </button>
    );
  }

  public getMiniViewButton = (): JSX.Element => {
    const { isMiniViewEnabled } = this.state;
    return isMiniViewEnabled ? (
      <button
        className='title-bar-button'
        title={i18n.t('Exit Mini view', TITLE_BAR_NAMESPACE)()}
        onClick={this.eventHandlers.onExitMiniView}
        onContextMenu={this.eventHandlers.onDisableContextMenu}
        onMouseDown={this.handleMouseDown}
      >
        <img
          alt={'Exit mini view icon'}
          src={'../renderer/assets/title-bar-exit-mini-view.svg'}
        />
      </button>
    ) : (
      <button
        className='title-bar-button'
        title={i18n.t('Mini view', TITLE_BAR_NAMESPACE)()}
        onClick={this.eventHandlers.onEnterMiniView}
        onContextMenu={this.eventHandlers.onDisableContextMenu}
        onMouseDown={this.handleMouseDown}
      >
        <img
          alt={'Mini view icon'}
          src={'../renderer/assets/title-bar-mini-view.svg'}
        />
      </button>
    );
  };

  /**
   * Method that closes the browser window
   */
  public close(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeMainWindow,
    });
  }

  /**
   * Method that minimizes the browser window
   */
  public minimize(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.minimizeMainWindow,
    });
  }

  /**
   * Method that maximize the browser window
   */
  public maximize(): void {
    if (this.state.isDisabled) {
      return;
    }
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.maximizeMainWindow,
    });
    this.setState({ isMaximized: true });
  }

  /**
   * Method that unmaximize the browser window
   */
  public unmaximize(): void {
    if (this.state.isDisabled) {
      return;
    }
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.unmaximizeMainWindow,
    });
  }

  /**
   * Handles the event when the mini view is exited.
   * Sends an IPC message to the main process indicating the exit of the mini view.
   *
   * @function onExitMiniView
   * @returns {void}
   */
  public onExitMiniView = (): void => {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.onExitMiniView,
    });
  };

  /**
   * Handles the event when the mini view is entered.
   * Sends an IPC message to the main process indicating the entry of the mini view.
   *
   * @function onEnterMiniView
   * @returns {void}
   */
  public onEnterMiniView = (): void => {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.onEnterMiniView,
    });
  };

  /**
   * Method that popup the application menu
   */
  public showMenu(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.popupMenu,
    });
  }

  /**
   * Prevent default to make sure buttons don't take focus
   * @param e
   */
  private handleMouseDown(e) {
    e.preventDefault();
  }

  /**
   * Adds borders to the edges of the window chrome
   */
  private addWindowBorders() {
    const borderBottom = document.createElement('div');
    borderBottom.className = 'bottom-window-border';

    document.body.appendChild(borderBottom);
    document.body.classList.add('window-border');
  }

  /**
   * Disables context menu for action buttons
   *
   * @param event
   */
  private disableContextMenu(event): boolean {
    event.preventDefault();
    return false;
  }

  /**
   * Updates the state with the give value
   * @param state
   */
  private updateState(state: Partial<IState>) {
    this.setState((s) => {
      return { ...s, ...state };
    });
  }
}
