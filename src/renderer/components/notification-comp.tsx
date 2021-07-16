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
  },
  light: {
    regularFlashingNotificationBgColor: '#aad4f8',
    notificationBackgroundColor: '#f1f1f3',
    notificationBorderColor: 'transparent',
  },
};

type Theme = '' | Themes.DARK | Themes.LIGHT;
interface INotificationState {
  title: string;
  company: string;
  body: string;
  image: string;
  icon: string;
  id: number;
  color: string;
  flash: boolean;
  isExternal: boolean;
  theme: Theme;
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
    onClose: (winKey) => (_event: mouseEventButton) => this.close(winKey),
    onClick: (data) => (_event: mouseEventButton) => this.click(data),
    onContextMenu: (event) => this.contextMenu(event),
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
        className={containerCssClass}
        style={{
          height: containerHeight,
          backgroundColor: themeColors.notificationBackgroundColor,
          borderColor: themeColors.notificationBorderColor,
        }}
        lang={i18n.getLocale()}
      >
        <div
          className={`close-button ${themeClassName}`}
          title={i18n.t('Close')()}
          onClick={this.eventHandlers.onClose(id)}
        >
          <img src={closeImgFilePath} alt='close' />
        </div>
        <div
          className='main-container'
          role='alert'
          onContextMenu={this.eventHandlers.onContextMenu}
          onClick={this.eventHandlers.onClick(id)}
          onMouseEnter={this.eventHandlers.onMouseEnter(id)}
          onMouseLeave={this.eventHandlers.onMouseLeave(id)}
        >
          <div className='logo-container'>{this.renderImage(icon)}</div>
          <div className='notification-container'>
            <div className='notification-header'>
              <div className='notification-header-content'>
                <span className={`title ${themeClassName}`}>{title}</span>
                {this.renderExtBadge(isExternal)}
              </div>
              {this.renderReplyButton(id, themeClassName)}
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
  private renderImage(imageUrl: string): JSX.Element | undefined {
    let imgClass = 'default-logo';
    let url = '../renderer/assets/notification-symphony-logo.svg';
    let alt = 'Symphony logo';
    const isDefaultUrl = imageUrl.includes('default.png');
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
  private close(id: number): void {
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
    data.color = this.isValidColor(color) ? color : '';
    data.isInputHidden = true;
    data.containerHeight = CONTAINER_HEIGHT;
    data.theme = data.theme ? data.theme : Themes.LIGHT;
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
    if (flash && theme) {
      if (isExternal) {
        currentColors.notificationBorderColor = '#F7CA3B';
      } else if (hasMention) {
        currentColors.notificationBorderColor =
          currentColors.notificationBorderColor;
      } else {
        // in case of regular message without mention
        currentColors.notificationBackgroundColor = color
          ? color
          : currentColors.regularFlashingNotificationBgColor;
        currentColors.notificationBorderColor = color
          ? color
          : theme === Themes.DARK
          ? '#2996fd'
          : 'transparent';
      }
    } else if (!flash && color) {
      currentColors.notificationBackgroundColor = currentColors.notificationBorderColor = color;
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
          title={i18n.t('Reply')()}
          onClick={this.eventHandlers.onOpenReply(id)}
        >
          {i18n.t('Reply')()}
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
}
