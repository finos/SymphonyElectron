import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';
import {
  darkTheme,
  getContainerCssClasses,
  getThemeColors,
  isValidColor,
  Theme,
  whiteColorRegExp,
} from '../notification-theme';
import { Themes } from './notification-settings';

interface INotificationState {
  title: string;
  company: string;
  body: string;
  image: string;
  icon: string | undefined;
  id: number;
  color: string;
  flash: boolean;
  isExternal: boolean;
  isUpdated: boolean;
  theme: Theme;
  hasIgnore: boolean;
  hasReply: boolean;
  hasMention: boolean;
  isInputHidden: boolean;
  containerHeight: number;
  canSendMessage: boolean;
}

type mouseEventButton =
  | React.MouseEvent<HTMLDivElement>
  | React.MouseEvent<HTMLButtonElement>;
type keyboardEvent = React.KeyboardEvent<HTMLInputElement>;

// Notification container height
const CONTAINER_HEIGHT = 100;
const CONTAINER_HEIGHT_WITH_INPUT = 142;

export default class NotificationComp extends React.Component<
  {},
  INotificationState
> {
  private readonly eventHandlers = {
    onClose: (winKey) => (_event: mouseEventButton) =>
      this.close(_event, winKey),
    onClick: (data) => (_event: mouseEventButton) => this.click(data),
    onContextMenu: (event) => this.contextMenu(event),
    onIgnore: (winKey) => (_event: mouseEventButton) => this.onIgnore(winKey),
    onMouseEnter: (winKey) => (_event: mouseEventButton) =>
      this.onMouseEnter(winKey),
    onMouseLeave: (winKey) => (_event: mouseEventButton) =>
      this.onMouseLeave(winKey),
    onOpenReply: (winKey) => (event: mouseEventButton) =>
      this.onOpenReply(event, winKey),
    onThumbsUp: () => (_event: mouseEventButton) => this.onThumbsUp(),
    onReply: (winKey) => (_event: mouseEventButton) => this.onReply(winKey),
    onKeyUp: (winKey) => (event: keyboardEvent) => this.onKeyUp(event, winKey),
  };
  private input: React.RefObject<HTMLInputElement>;

  constructor(props) {
    super(props);
    this.state = {
      title: '',
      company: 'Symphony',
      body: '',
      image: '',
      icon: '',
      id: 0,
      color: '',
      flash: false,
      isExternal: false,
      isUpdated: false,
      theme: '',
      isInputHidden: true,
      hasIgnore: false,
      hasReply: false,
      hasMention: false,
      containerHeight: CONTAINER_HEIGHT,
      canSendMessage: false,
    };
    this.updateState = this.updateState.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.resetNotificationData = this.resetNotificationData.bind(this);
    this.getInputValue = this.getInputValue.bind(this);

    this.input = React.createRef();
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('notification-data', this.updateState);
  }

  /**
   * Callback to handle event when a component is unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener('notification-data', this.updateState);
  }

  /**
   * Renders the component
   */
  public render(): JSX.Element {
    const {
      title,
      body,
      id,
      color,
      isExternal,
      isUpdated,
      theme,
      hasMention,
      containerHeight,
      flash,
      icon,
    } = this.state;
    let themeClassName;
    if (theme) {
      themeClassName = theme;
    } else if (darkTheme.includes(color.toLowerCase())) {
      themeClassName = 'black-text';
    } else {
      themeClassName =
        color && color.match(whiteColorRegExp) ? Themes.LIGHT : Themes.DARK;
    }
    const themeColors = getThemeColors(
      theme,
      flash,
      isExternal,
      hasMention,
      color,
    );
    const closeImgFilePath = `../renderer/assets/close-icon-${themeClassName}.svg`;
    let containerCssClass = `container ${themeClassName} `;
    const customCssClasses = getContainerCssClasses(
      theme,
      flash,
      isExternal,
      hasMention,
    );
    containerCssClass += customCssClasses.join(' ');
    return (
      <div
        data-testid='NOTIFICATION_CONTAINER'
        className={containerCssClass}
        style={{
          height: containerHeight,
          backgroundColor: themeColors.notificationBackgroundColor,
          borderColor: themeColors.notificationBorderColor,
        }}
        lang={i18n.getLocale()}
        onMouseEnter={this.eventHandlers.onMouseEnter(id)}
        onMouseLeave={this.eventHandlers.onMouseLeave(id)}
      >
        <div
          className={`close-button ${themeClassName}`}
          title={i18n.t('Close')()}
        >
          <img
            src={closeImgFilePath}
            title={i18n.t('Close')()}
            alt='close'
            onClick={this.eventHandlers.onClose(id)}
          />
        </div>
        <div
          className='main-container'
          role='alert'
          onContextMenu={this.eventHandlers.onContextMenu}
          onClick={this.eventHandlers.onClick(id)}
        >
          <div className='logo-container'>{this.renderImage(icon)}</div>
          <div className='notification-container'>
            <div className='notification-header'>
              <div className='notification-header-content'>
                <span className={`title ${themeClassName}`}>{title}</span>
                {this.renderExtBadge(isExternal)}
              </div>
              {this.renderReplyButton(id, themeClassName)}
              {this.renderIgnoreButton(id, themeClassName)}
            </div>
            <div className={`message-preview ${themeClassName}`}>
              {this.renderUpdatedBadge(isUpdated)}
              {body}
            </div>
          </div>
        </div>
        {this.renderRTE(themeClassName)}
      </div>
    );
  }

  /**
   * Renders RTE
   * @param isInputHidden
   */
  private renderRTE(themeClassName: string): JSX.Element | undefined {
    const { canSendMessage, isInputHidden, id } = this.state;
    const actionButtonContainer = classNames('rte-button-container', {
      'action-container-margin': !isInputHidden,
    });
    if (!isInputHidden) {
      return (
        <div className='rte-container'>
          <div className='input-container'>
            <input
              className={themeClassName}
              autoFocus={true}
              onKeyUp={this.eventHandlers.onKeyUp(id)}
              onChange={this.onInputChange}
              ref={this.input}
            />
          </div>
          <div className={actionButtonContainer}>
            <button
              className={`rte-thumbsup-button ${themeClassName}`}
              onClick={this.eventHandlers.onThumbsUp()}
            >
              👍
            </button>
            <button
              className={`rte-send-button ${themeClassName}`}
              onClick={this.eventHandlers.onReply(id)}
              disabled={!canSendMessage}
              title={i18n.t('Send')()}
            />
          </div>
        </div>
      );
    }
    return;
  }

  /**
   * Renders the UPDATED badge
   * @param isUpdated
   * @returns the updated badge if the message is updated
   */
  private renderUpdatedBadge(isUpdated: boolean) {
    if (!isUpdated) {
      return;
    }
    return <div className='updated-badge'>{i18n.t('Updated')()}</div>;
  }

  /**
   * Renders external badge if the content is from external
   * @param isExternal
   */
  private renderExtBadge(isExternal: boolean): JSX.Element | undefined {
    if (!isExternal) {
      return;
    }
    return (
      <div className='ext-badge-container'>
        <img
          src='../renderer/assets/notification-ext-badge.svg'
          alt='ext-badge'
        />
      </div>
    );
  }
  /**
   * Renders image if provided otherwise renders symphony logo
   * @param imageUrl
   */
  private renderImage(imageUrl: string | undefined): JSX.Element | undefined {
    let imgClass = 'default-logo';
    let url = '../renderer/assets/notification-symphony-logo.svg';
    let alt = 'Symphony logo';
    const isDefaultUrl = imageUrl && imageUrl.includes('default.png');
    const shouldDisplayBadge = !!imageUrl && !isDefaultUrl;
    if (imageUrl && !isDefaultUrl) {
      imgClass = 'profile-picture';
      url = imageUrl;
      alt = 'Profile picture';
    }
    return (
      <div className='logo'>
        <img className={imgClass} src={url} alt={alt} />
        {this.renderSymphonyBadge(shouldDisplayBadge)}
      </div>
    );
  }

  /**
   * Renders profile picture symphpony badge
   * @param hasImageUrl
   */
  private renderSymphonyBadge(hasImageUrl: boolean): JSX.Element | undefined {
    if (hasImageUrl) {
      return (
        <img
          src='../renderer/assets/symphony-badge.svg'
          alt=''
          className='profile-picture-badge'
        />
      );
    }
    return;
  }

  /**
   * Invoked when the notification window is clicked
   *
   * @param id {number}
   */
  private click(id: number): void {
    ipcRenderer.send('notification-clicked', id);
  }

  /**
   * Closes the notification
   *
   * @param id {number}
   */
  private close(event: any, id: number): void {
    event.stopPropagation();
    ipcRenderer.send('close-notification', id);
  }

  /**
   * Disable context menu
   *
   * @param event
   */
  private contextMenu(event): void {
    event.preventDefault();
  }

  /**
   * Handle mouse enter
   *
   * @param id {number}
   */
  private onMouseEnter(id: number): void {
    ipcRenderer.send('notification-mouseenter', id);
  }

  /**
   * Handle mouse over
   *
   * @param id {number}
   */
  private onMouseLeave(id: number): void {
    const { isInputHidden } = this.state;
    ipcRenderer.send('notification-mouseleave', id, isInputHidden);
  }

  /**
   * Insets a thumbs up emoji
   * @private
   */
  private onThumbsUp(): void {
    if (this.input.current) {
      const input = this.input.current.value;
      this.input.current.value = input + '👍';
      this.onInputChange();
      this.input.current.focus();
    }
  }

  /**
   * Handles ignore action
   * @param id
   * @private
   */
  private onIgnore(id: number): void {
    ipcRenderer.send('notification-on-ignore', id);
  }

  /**
   * Handles reply action
   * @param id
   * @private
   */
  private onReply(id: number): void {
    let replyText = this.getInputValue();
    if (replyText) {
      // need to replace 👍 with :thumbsup: to make sure client displays the correct emoji
      replyText = replyText.replace(/👍/g, ':thumbsup: ');
      ipcRenderer.send('notification-on-reply', id, replyText);
    }
  }

  /**
   * Displays an input on the notification
   *
   * @private
   */
  private onOpenReply(event, id) {
    event.stopPropagation();
    ipcRenderer.send('show-reply', id);
    this.setState(
      {
        isInputHidden: false,
        hasReply: false,
        containerHeight: CONTAINER_HEIGHT_WITH_INPUT,
      },
      () => {
        this.input.current?.focus();
      },
    );
  }

  /**
   * Trim and returns the input value
   * @private
   */
  private getInputValue(): string | undefined {
    return this.input.current?.value.trim();
  }

  /**
   * Handles key up event and enter keyCode
   *
   * @param event
   * @param id
   * @private
   */
  private onKeyUp(event, id) {
    if (event.key === 'Enter' || event.keyCode === 13) {
      this.onReply(id);
    }
  }

  /**
   * Updates the send button state based on input change
   * @private
   */
  private onInputChange() {
    if (this.input.current) {
      const inputText = this.input.current.value || '';
      this.setState({
        canSendMessage: inputText.trim().length > 0,
      });
    }
  }

  /**
   * Sets the component state
   *
   * @param _event
   * @param data {Object}
   */
  private updateState(_event, data): void {
    const { color } = data;
    // FYI: 1.5 sends hex color but without '#', reason why we check and add prefix if necessary.
    // Goal is to keep backward compatibility with 1.5 colors (SDA v. 9.2.0)
    const isOldColor = /^([A-Fa-f0-9]{6})/.test(color);
    data.color = isOldColor ? `#${color}` : isValidColor(color) ? color : '';
    data.isInputHidden = true;
    data.containerHeight = CONTAINER_HEIGHT;
    // FYI: 1.5 doesn't send current theme. We need to deduce it from the color that is sent.
    // Goal is to keep backward compatibility with 1.5 themes (SDA v. 9.2.0)
    data.theme =
      isOldColor && darkTheme.includes(data.color)
        ? Themes.DARK
        : data.theme
        ? data.theme
        : Themes.LIGHT;
    this.resetNotificationData();
    this.setState(data as INotificationState);
  }

  /**
   * Reset data for new notification
   * @private
   */
  private resetNotificationData(): void {
    if (this.input.current) {
      this.input.current.value = '';
    }
  }

  /**
   * Renders reply button
   * @param id
   * @param theming
   */
  private renderReplyButton(
    id: number,
    theming: string,
  ): JSX.Element | undefined {
    const { hasReply } = this.state;
    if (hasReply) {
      return (
        <button
          className={`action-button ${theming}`}
          style={{ display: hasReply ? 'block' : 'none' }}
          onClick={this.eventHandlers.onOpenReply(id)}
        >
          {i18n.t('Reply')()}
        </button>
      );
    }
    return;
  }

  /**
   * Renders ignore button
   * @param id
   * @param theming
   */
  private renderIgnoreButton(
    id: number,
    theming: string,
  ): JSX.Element | undefined {
    if (this.state.hasIgnore) {
      return (
        <button
          className={`action-button ${theming}`}
          style={{ display: 'block' }}
          onClick={this.eventHandlers.onIgnore(id)}
        >
          {i18n.t('Ignore')()}
        </button>
      );
    }
    return;
  }
}
