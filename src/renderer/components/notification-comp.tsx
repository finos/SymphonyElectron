import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';
import { Themes } from './notification-settings';

const whiteColorRegExp = new RegExp(
  /^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i,
);
const darkTheme = [
  '#e23030',
  '#b5616a',
  '#ab8ead',
  '#ebc875',
  '#a3be77',
  '#58c6ff',
  '#ebab58',
];

const Colors = {
  dark: {
    regularFlashingNotificationBgColor: '#27588e',
    notificationBackgroundColor: '#27292c',
    notificationBorderColor: '#717681',
    mentionBackgroundColor: '#99342c',
    mentionBorderColor: '#ff5d50',
  },
  light: {
    regularFlashingNotificationBgColor: '#aad4f8',
    notificationBackgroundColor: '#f1f1f3',
    notificationBorderColor: 'transparent',
    mentionBackgroundColor: '#fcc1b9',
    mentionBorderColor: 'transparent',
  },
};

type Theme = '' | Themes.DARK | Themes.LIGHT;
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
const LIGHT_THEME = '#EAEBEC';
const DARK_THEME = '#25272B';

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
      theme,
      containerHeight,
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
    const themeColors = this.getThemeColors();
    const closeImgFilePath = `../renderer/assets/close-icon-${themeClassName}.svg`;
    let containerCssClass = `container ${themeClassName} `;
    const customCssClasses = this.getContainerCssClasses();
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
            <span className={`message-preview ${themeClassName}`}>{body}</span>
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
    data.color = isOldColor
      ? `#${color}`
      : this.isValidColor(color)
      ? color
      : '';
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
   * Validates the color
   * @param color
   * @private
   */
  private isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6})/.test(color);
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
   * Returns notification colors based on theme
   * @param theme Current theme, can be either light or dark
   */
  private getThemeColors(): { [key: string]: string } {
    const { theme, flash, isExternal, hasMention, color } = this.state;
    const currentColors =
      theme === Themes.DARK ? { ...Colors.dark } : { ...Colors.light };
    const externalFlashingBackgroundColor =
      theme === Themes.DARK ? '#70511f' : '#f6e5a6';
    if (flash && theme) {
      if (isExternal) {
        if (!hasMention) {
          currentColors.notificationBorderColor = '#F7CA3B';
          currentColors.notificationBackgroundColor = externalFlashingBackgroundColor;
          if (this.isCustomColor(color)) {
            currentColors.notificationBorderColor = this.getThemedCustomBorderColor(
              theme,
              color,
            );
            currentColors.notificationBackgroundColor = color;
          }
        } else {
          currentColors.notificationBorderColor = '#F7CA3B';
        }
      } else if (hasMention) {
        currentColors.notificationBorderColor =
          currentColors.notificationBorderColor;
      } else {
        // in case of regular message without mention
        // FYI: SDA versions prior to 9.2.3 do not support theme color properly, reason why SFE-lite is pushing notification default background color.
        // For this reason, to be backward compatible, we check if sent color correspond to 'default' background color. If yes, we should ignore it and not consider it as a custom color.
        currentColors.notificationBackgroundColor = this.isCustomColor(color)
          ? color
          : currentColors.regularFlashingNotificationBgColor;
        currentColors.notificationBorderColor = this.isCustomColor(color)
          ? this.getThemedCustomBorderColor(theme, color)
          : theme === Themes.DARK
          ? '#2996fd'
          : 'transparent';
      }
    } else if (!flash) {
      if (hasMention) {
        currentColors.notificationBackgroundColor =
          currentColors.mentionBackgroundColor;
        currentColors.notificationBorderColor =
          currentColors.mentionBorderColor;
      } else if (this.isCustomColor(color)) {
        currentColors.notificationBackgroundColor = color;
        currentColors.notificationBorderColor = this.getThemedCustomBorderColor(
          theme,
          color,
        );
      } else if (isExternal) {
        currentColors.notificationBorderColor = '#F7CA3B';
      }
    }
    return currentColors;
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

  /**
   * This function aims at providing toast notification css classes
   */
  private getContainerCssClasses(): string[] {
    const customClasses: string[] = [];
    const { flash, theme, hasMention, isExternal } = this.state;
    if (flash && theme) {
      if (isExternal) {
        customClasses.push('external-border');
        if (hasMention) {
          customClasses.push(`${theme}-ext-mention-flashing`);
        } else {
          customClasses.push(`${theme}-ext-flashing`);
        }
      } else if (hasMention) {
        customClasses.push(`${theme}-mention-flashing`);
      } else {
        // In case it's a regular message notification
        customClasses.push(`${theme}-flashing`);
      }
    } else if (isExternal) {
      customClasses.push('external-border');
    }
    return customClasses;
  }

  /**
   * SDA versions prior to 9.2.3 do not support theme color properly, reason why SFE-lite is pushing notification default background color and theme.
   * For that reason, we try to identify if provided color is the default one or not.
   * @param color color sent through SDABridge
   * @returns boolean
   */
  private isCustomColor(color: string): boolean {
    if (color && color !== LIGHT_THEME && color !== DARK_THEME) {
      return true;
    }
    return false;
  }

  /**
   * Function that allows to increase color brightness
   * @param hex hes color
   * @param percent percent
   * @returns new hex color
   */
  private increaseBrightness(hex: string, percent: number) {
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    return (
      '#' +
      // tslint:disable-next-line: no-bitwise
      (0 | ((1 << 8) + r + ((256 - r) * percent) / 100))
        .toString(16)
        .substr(1) +
      // tslint:disable-next-line: no-bitwise
      (0 | ((1 << 8) + g + ((256 - g) * percent) / 100))
        .toString(16)
        .substr(1) +
      // tslint:disable-next-line: no-bitwise
      (0 | ((1 << 8) + b + ((256 - b) * percent) / 100)).toString(16).substr(1)
    );
  }

  /**
   * Returns custom border color
   * @param theme current theme
   * @param customColor color
   * @returns custom border color
   */
  private getThemedCustomBorderColor(theme: string, customColor: string) {
    return theme === Themes.DARK
      ? this.increaseBrightness(customColor, 50)
      : 'transparent';
  }
}
