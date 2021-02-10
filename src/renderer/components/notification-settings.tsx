import { ipcRenderer } from 'electron';
import * as React from 'react';
import { apiCmds, apiName } from '../../common/api-interface';

import { i18n } from '../../common/i18n-preload';

const NOTIFICATION_SETTINGS_NAMESPACE = 'NotificationSettings';

type startCorner = 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left';

interface IState {
  position: startCorner;
  screens: Electron.Display[];
  display: number;
  theme: Themes;
}

export enum Themes {
  LIGHT = 'light',
  DARK = 'dark',
}

/**
 * Notification Window component
 */
export default class NotificationSettings extends React.Component<{}, IState> {
  constructor(props) {
    super(props);
    this.state = {
      position: 'upper-right',
      screens: [],
      display: 1,
      theme: Themes.LIGHT,
    };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Renders the notification settings window
   */
  public render(): JSX.Element {
    if (this.state.theme === Themes.DARK) {
      document.body.classList.add('dark-mode');
    }

    return (
      <div
        className='content'
        style={
          this.state.theme === Themes.DARK
            ? { backgroundColor: '#25272B' }
            : undefined
        }
      >
        <header
          className='header'
          style={
            this.state.theme === Themes.DARK
              ? { color: 'white', borderBottom: '1px solid #525760' }
              : undefined
          }
        >
          <span className='header-title'>
            {i18n.t(
              'Set Notification Position',
              NOTIFICATION_SETTINGS_NAMESPACE,
            )()}
          </span>
        </header>
        <div className='form'>
          <label
            className='display-label'
            style={
              this.state.theme === Themes.DARK ? { color: 'white' } : undefined
            }
          >
            {i18n.t('Show on display', NOTIFICATION_SETTINGS_NAMESPACE)()}
          </label>
          <div id='screens' className='display-container'>
            <select
              className='display-selector'
              style={
                this.state.theme === Themes.DARK
                  ? {
                      border: '2px solid #767A81',
                      backgroundColor: '#25272B',
                      color: 'white',
                    }
                  : undefined
              }
              id='screen-selector'
              title={i18n.t('Position', NOTIFICATION_SETTINGS_NAMESPACE)()}
              value={this.state.display}
              onChange={this.selectDisplay.bind(this)}
            >
              {this.renderScreens()}
            </select>
          </div>
          <label
            className='position-label'
            style={
              this.state.theme === Themes.DARK ? { color: 'white' } : undefined
            }
          ></label>
          <div
            className='position-container'
            style={
              this.state.theme === Themes.DARK
                ? { background: '#2E3136' }
                : undefined
            }
          >
            <div className='button-set-left'>
              {this.renderPositionButton('upper-left', 'Top Left')}
              {this.renderPositionButton('lower-left', 'Bottom Left')}
            </div>
            <div className='button-set-right'>
              {this.renderPositionButton('upper-right', 'Top Right')}
              {this.renderPositionButton('lower-right', 'Bottom Right')}
            </div>
          </div>
        </div>
        <footer
          className='footer'
          style={
            this.state.theme === Themes.DARK
              ? { borderTop: '1px solid #525760' }
              : undefined
          }
        >
          <div className='footer-button-container'>
            <button
              id='cancel'
              className='footer-button footer-button-dismiss'
              onClick={this.close.bind(this)}
              style={
                this.state.theme === Themes.DARK
                  ? { backgroundColor: '#25272B', color: 'white' }
                  : undefined
              }
            >
              {i18n.t('CANCEL', NOTIFICATION_SETTINGS_NAMESPACE)()}
            </button>
            <button
              id='ok-button'
              className='footer-button footer-button-ok'
              onClick={this.submit.bind(this)}
              style={
                this.state.theme === Themes.DARK
                  ? { backgroundColor: '#25272B', color: 'white' }
                  : undefined
              }
            >
              {i18n.t('OK', NOTIFICATION_SETTINGS_NAMESPACE)()}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  /**
   * Handles event when the component is mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('notification-settings-data', this.updateState);
  }

  /**
   * Handles event when the component is unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener('notification-settings-data', this.updateState);
  }

  /**
   * Updates the selected display state
   *
   * @param event
   */
  public selectDisplay(event): void {
    this.setState({ display: event.target.value });
  }

  /**
   * Updates the selected notification position
   *
   * @param event
   */
  public togglePosition(event): void {
    this.setState({
      position: event.target.id,
    });
  }

  /**
   * Submits the new settings to the main process
   */
  public submit(): void {
    const { position, display } = this.state;
    ipcRenderer.send('notification-settings-update', { position, display });
  }

  /**
   * Closes the notification settings window
   */
  public close(): void {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeWindow,
      windowType: 'notification-settings',
    });
  }

  /**
   * Renders the position buttons
   *
   * @param id
   * @param content
   */
  private renderPositionButton(id: startCorner, content: string): JSX.Element {
    const style = this.getPositionButtonStyle(id);
    return (
      <div className='position-button-container'>
        <button
          onClick={this.togglePosition.bind(this)}
          className='position-button'
          style={style}
          id={id}
          data-testid={id}
          type='button'
          name='position'
          value={id}
        >
          {i18n.t(`${content}`, NOTIFICATION_SETTINGS_NAMESPACE)()}
        </button>
      </div>
    );
  }

  /**
   * Gets the text color and background color of a position button
   *
   * @param id
   */
  private getPositionButtonStyle(id: string): React.CSSProperties {
    let style: React.CSSProperties;
    if (this.state.position === id) {
      style = { backgroundColor: '#008EFF', color: 'white' };
    } else if (this.state.theme === Themes.DARK) {
      style = { backgroundColor: '#25272B', color: 'white' };
    } else {
      style = { backgroundColor: '#F8F8F9', color: '#17181B' };
    }
    return style;
  }

  /**
   * Renders the drop down list of available screens
   */
  private renderScreens(): JSX.Element[] {
    const { screens } = this.state;
    return screens.map((screen, index) => {
      const screenId = screen.id;
      return (
        <option id={String(screenId)} key={screenId} value={screenId}>
          {index + 1}/{screens.length}
        </option>
      );
    });
  }

  /**
   * Sets the component state
   *
   * @param _event
   * @param data {Object} { buildNumber, clientVersion, version }
   */
  private updateState(_event, data): void {
    this.setState(data as IState);
  }
}
