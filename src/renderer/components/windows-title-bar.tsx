import { ipcRenderer } from 'electron';
import * as React from 'react';

import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';

interface IState {
  title: string;
  isMaximized: boolean;
  isDisabled: boolean;
}
const TITLE_BAR_NAMESPACE = 'TitleBar';

export default class WindowsTitleBar extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onClose: () => this.close(),
    onMaximize: () => this.maximize(),
    onMinimize: () => this.minimize(),
    onShowMenu: () => this.showMenu(),
    onUnmaximize: () => this.unmaximize(),
    onDisableContextMenu: (event) => this.disableContextMenu(event),
  };
  private observer: MutationObserver | undefined;

  constructor(props) {
    super(props);
    this.state = {
      title: document.title || 'Symphony',
      isMaximized: false,
      isDisabled: false,
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
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    const target = document.querySelector('title');
    this.observer = new MutationObserver((mutations) => {
      const title: string = mutations[0].target.textContent
        ? mutations[0].target.textContent
        : 'Symphony';
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
    const { title } = this.state;

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
            <svg x='0px' y='0px' viewBox='0 0 15 10'>
              <rect fill='rgba(255, 255, 255, 0.9)' width='15' height='1' />
              <rect
                fill='rgba(255, 255, 255, 0.9)'
                y='4'
                width='15'
                height='1'
              />
              <rect
                fill='rgba(255, 255, 255, 0.9)'
                y='8'
                width='152'
                height='1'
              />
            </svg>
          </button>
        </div>
        <div className='title-container'>
          {this.getSymphonyLogo()}
          <p id='title-bar-title'>{title}</p>
        </div>
        <div className='title-bar-button-container'>
          <button
            className='title-bar-button'
            title={i18n.t('Minimize', TITLE_BAR_NAMESPACE)()}
            onClick={this.eventHandlers.onMinimize}
            onContextMenu={this.eventHandlers.onDisableContextMenu}
            onMouseDown={this.handleMouseDown}
          >
            <svg x='0px' y='0px' viewBox='0 0 14 1'>
              <rect fill='rgba(255, 255, 255, 0.9)' width='14' height='0.6' />
            </svg>
          </button>
        </div>
        <div className='title-bar-button-container'>
          {this.renderMaximizeButtons()}
        </div>
        <div className='title-bar-button-container'>
          <button
            className='title-bar-button'
            title={i18n.t('Close', TITLE_BAR_NAMESPACE)()}
            onClick={this.eventHandlers.onClose}
            onContextMenu={this.eventHandlers.onDisableContextMenu}
            onMouseDown={this.handleMouseDown}
          >
            <svg x='0px' y='0px' viewBox='0 0 14 10.2'>
              <polygon
                fill='rgba(255, 255, 255, 0.9)'
                points='10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1 '
              />
            </svg>
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
          <svg x='0px' y='0px' viewBox='0 0 14 11.2'>
            <path
              fill={
                isDisabled
                  ? 'rgba(149, 149, 149, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)'
              }
              d='M2.1,0v2H0v8.1h8.2v-2h2V0H2.1z M7.2,9.2H1.1V3h6.1V9.2z M9.2,7.1h-1V2H3.1V1h6.1V7.1z'
            />
          </svg>
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
        <svg x='0px' y='0px' viewBox='0 0 14 11.2'>
          <path
            fill={
              isDisabled
                ? 'rgba(149, 149, 149, 0.9)'
                : 'rgba(255, 255, 255, 0.9)'
            }
            d='M0,0v10.1h10.2V0H0z M9.2,9.2H1.1V1h8.1V9.2z'
          />
        </svg>
      </button>
    );
  }

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
   * Returns the title bar logo
   */
  private getSymphonyLogo(): JSX.Element {
    return (
      <svg width='20' viewBox='-10 0 60 60' fill='none'>
        <path
          d='M40 20.111V9.653c0-2.142-1.1-4.153-2.883-5.255C34.458 2.754 28.7 0 20 0 11.3 0 5.542 2.754 2.883 4.407 1.1 5.5 0 7.511 0 9.653v15.705l31.667 9.618v6.995c0 .945-.567 1.61-1.534 2.108L20 49.404 9.808 44.052c-.908-.472-1.475-1.136-1.475-2.08v-5.247L0 34.102v7.87c0 4.319 2.358 7.991 6.108 9.906L20 59.46l13.833-7.546C37.642 49.963 40 46.291 40 41.971V28.855L8.333 19.237v-7.983C10.6 10.108 14.45 8.744 20 8.744s9.4 1.364 11.667 2.51v6.234L40 20.111z'
          fill='#0098FF'
        />
        <path
          d='M40 20.111V9.653c0-2.142-1.1-4.153-2.883-5.255C34.458 2.754 28.7 0 20 0 11.3 0 5.542 2.754 2.883 4.407 1.1 5.5 0 7.511 0 9.653v15.705l31.667 9.618v6.995c0 .945-.567 1.61-1.534 2.108L20 49.404 9.808 44.052c-.908-.472-1.475-1.136-1.475-2.08v-5.247L0 34.102v7.87c0 4.319 2.358 7.991 6.108 9.906L20 59.46l13.833-7.546C37.642 49.963 40 46.291 40 41.971V28.855L8.333 19.237v-7.983C10.6 10.108 14.45 8.744 20 8.744s9.4 1.364 11.667 2.51v6.234L40 20.111z'
          fill='url(#prefix__paint0_radial)'
        />
        <defs>
          <radialGradient
            id='prefix__paint0_radial'
            cx={0}
            cy={0}
            r={1}
            gradientUnits='userSpaceOnUse'
            gradientTransform='matrix(0 40.259 -50.3704 0 20.07 0)'
          >
            <stop stopColor='#fff' stopOpacity={0.4} />
            <stop offset={1} stopColor='#fff' stopOpacity={0} />
          </radialGradient>
        </defs>
      </svg>
    );
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
