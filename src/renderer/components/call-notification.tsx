import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';
import { isMac } from '../../common/env';
import {
  darkTheme,
  getContainerCssClasses,
  getThemeColors,
  isValidColor,
  Theme,
  whiteColorRegExp,
} from '../notification-theme';
import { Themes } from './notification-settings';

type CallType = 'IM' | 'ROOM' | 'OTHER';

interface ICallNotificationState {
  title: string;
  primaryText: string;
  secondaryText?: string;
  company: string;
  companyIconUrl?: string;
  profilePlaceHolderText: string;
  actionIconUrl?: string;
  callType: CallType;
  shouldDisplayBadge: boolean;
  acceptButtonText?: string;
  rejectButtonText?: string;
  image: string;
  icon: string | undefined;
  id: number;
  color: string;
  flash: boolean;
  isExternal: boolean;
  theme: Theme;
  isPrimaryTextOverflowing: boolean;
  isSecondaryTextOverflowing: boolean;
  isFederatedEnabled: boolean;
  zoomFactor: number;
}

type mouseEventButton =
  | React.MouseEvent<HTMLDivElement>
  | React.MouseEvent<HTMLButtonElement>;

export default class CallNotification extends React.Component<
  {},
  ICallNotificationState
> {
  private readonly eventHandlers = {
    onClick: (data) => (_event: mouseEventButton) => this.click(data),
    onAccept: (data) => (event: mouseEventButton) => this.accept(event, data),
    onReject: (data) => (event: mouseEventButton) => this.reject(event, data),
  };
  private readonly defaultState: ICallNotificationState;
  private readonly primaryTooltipRef: React.RefObject<HTMLDivElement>;
  private readonly secondaryTooltipRef: React.RefObject<HTMLDivElement>;

  constructor(props) {
    super(props);
    this.primaryTooltipRef = React.createRef();
    this.secondaryTooltipRef = React.createRef();
    this.defaultState = {
      title: 'Incoming call',
      primaryText: 'unknown',
      secondaryText: '',
      company: 'Symphony',
      companyIconUrl: '',
      profilePlaceHolderText: 'S',
      callType: 'IM',
      shouldDisplayBadge: true,
      image: '',
      icon: '',
      id: 0,
      color: '',
      flash: false,
      isExternal: false,
      theme: '',
      isPrimaryTextOverflowing: false,
      isSecondaryTextOverflowing: false,
      isFederatedEnabled: false,
      zoomFactor: 1,
    };
    this.state = { ...this.defaultState };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('call-notification-data', this.updateState);
    ipcRenderer.on('zoom-factor-change', this.setZoomFactor);
  }

  /**
   * Callback to handle event when a component is unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener('call-notification-data', this.updateState);
    ipcRenderer.on('zoom-factor-change', this.setZoomFactor);
  }

  /**
   * Renders the component
   */
  public render(): JSX.Element {
    const {
      id,
      title,
      primaryText,
      secondaryText,
      company,
      companyIconUrl,
      color,
      profilePlaceHolderText,
      callType,
      acceptButtonText,
      rejectButtonText,
      shouldDisplayBadge,
      isExternal,
      theme,
      flash,
      icon,
      isPrimaryTextOverflowing,
      isSecondaryTextOverflowing,
      isFederatedEnabled,
      zoomFactor,
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
      false,
      color,
      isFederatedEnabled,
    );
    const customCssClasses = getContainerCssClasses(
      theme,
      flash,
      isExternal,
      false,
      isFederatedEnabled,
    );
    let containerCssClass = `container ${themeClassName} `;
    customCssClasses.push(isMac ? 'mac' : 'windows');
    containerCssClass += customCssClasses.join(' ');

    const acceptText = acceptButtonText
      ? acceptButtonText
      : callType === 'IM' || callType === 'ROOM'
      ? 'join'
      : 'answer';
    const rejectText = rejectButtonText ? rejectButtonText : 'decline';

    return (
      <div
        data-testid='CALL_NOTIFICATION_CONTAINER'
        className={containerCssClass}
        style={{
          backgroundColor: themeColors.notificationBackgroundColor,
          borderColor: themeColors.notificationBorderColor,
        }}
        onClick={this.eventHandlers.onClick(id)}
      >
        <div className={`title ${themeClassName}`} style={{ zoom: zoomFactor }}>
          {title}
        </div>
        <div className='caller-info-container' style={{ zoom: zoomFactor }}>
          <div className='logo-container'>
            {this.renderImage(
              icon,
              profilePlaceHolderText,
              callType,
              shouldDisplayBadge,
              isExternal,
            )}
          </div>
          <div className='info-text-container'>
            <div className='primary-text-container'>
              <div className='caller-name-container'>
                <div
                  data-testid='CALL_NOTIFICATION_NAME'
                  className={`caller-name ${themeClassName} tooltip-trigger`}
                  ref={this.primaryTooltipRef}
                >
                  {primaryText}
                </div>
                {isPrimaryTextOverflowing && (
                  <div className='tooltip-content tooltip-primary'>
                    {primaryText}
                  </div>
                )}
                {this.renderExtBadge(isExternal)}
              </div>
            </div>
            {secondaryText ? (
              <div className='secondary-text-container'>
                <div className='caller-details'>
                  <div
                    className={`caller-role ${themeClassName} tooltip-trigger`}
                    ref={this.secondaryTooltipRef}
                  >
                    {secondaryText}
                  </div>
                  {isSecondaryTextOverflowing && (
                    <div className='tooltip-content tooltip-secondary'>
                      {secondaryText}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <></>
            )}
            {company || companyIconUrl ? (
              <div className='tertiary-text-container'>
                <div className='application-details'>
                  {company && companyIconUrl && (
                    <img
                      className={'company-icon'}
                      src={companyIconUrl}
                      alt={'company logo'}
                    />
                  )}
                  <div className={`company-name ${themeClassName}`}>
                    {company}
                  </div>
                </div>
              </div>
            ) : (
              <></>
            )}
          </div>
        </div>
        <div className='actions' style={{ zoom: zoomFactor }}>
          <button
            data-testid='CALL_NOTIFICATION_REJECT_BUTTON'
            className={classNames('decline', {
              'call-type-other': callType === 'OTHER',
            })}
            onClick={this.eventHandlers.onReject(id)}
          >
            <div className='label'>{rejectText}</div>
          </button>
          <button
            data-testid='CALL_NOTIFICATION_ACCEPT_BUTTON'
            className={classNames('accept', {
              'call-type-other': callType === 'OTHER',
            })}
            onClick={this.eventHandlers.onAccept(id)}
          >
            <div className='label'>{acceptText}</div>
          </button>
        </div>
      </div>
    );
  }

  private click = (id: number) => {
    ipcRenderer.send('call-notification-clicked', id);
  };

  private accept = (event, id: number) => {
    event.stopPropagation();
    ipcRenderer.send('call-notification-on-accept', id);
  };

  private reject = (event, id: number) => {
    event.stopPropagation();
    ipcRenderer.send('call-notification-on-reject', id);
  };

  private checkTextOverflow = () => {
    const primaryTooltipElement = this.primaryTooltipRef.current;
    const secondaryTooltipElement = this.secondaryTooltipRef.current;
    // Check if the primary text content overflows the element
    if (
      primaryTooltipElement &&
      primaryTooltipElement.scrollWidth > primaryTooltipElement.clientWidth
    ) {
      this.setState({ isPrimaryTextOverflowing: true });
    } else {
      this.setState({ isPrimaryTextOverflowing: false });
    }
    // Check if the secondary text content overflows the element
    if (
      secondaryTooltipElement &&
      secondaryTooltipElement.scrollWidth > secondaryTooltipElement.clientWidth
    ) {
      this.setState({ isSecondaryTextOverflowing: true });
    } else {
      this.setState({ isSecondaryTextOverflowing: false });
    }
  };

  /**
   * Sets the component state
   *
   * @param _event
   * @param data {Object}
   */
  private updateState(_event, data): void {
    this.setState({ ...this.defaultState });
    const { color } = data;
    // FYI: 1.5 sends hex color but without '#', reason why we check and add prefix if necessary.
    // Goal is to keep backward compatibility with 1.5 colors (SDA v. 9.2.0)
    const isOldColor = /^([A-Fa-f0-9]{6})/.test(color);
    data.color = isOldColor ? `#${color}` : isValidColor(color) ? color : '';
    data.isInputHidden = true;
    // FYI: 1.5 doesn't send current theme. We need to deduce it from the color that is sent.
    // Goal is to keep backward compatibility with 1.5 themes (SDA v. 9.2.0)
    data.theme =
      isOldColor && darkTheme.includes(data.color)
        ? Themes.DARK
        : data.theme
        ? data.theme
        : Themes.LIGHT;
    this.setState(data as ICallNotificationState);
    this.checkTextOverflow();
  }

  /**
   * Set notification zoom factor
   */
  private setZoomFactor = (_event, zoomFactor) => {
    this.setState({ zoomFactor });
  };

  /**
   * Renders image if provided otherwise renders Symphony Messaging logo
   * @param imageUrl
   * @param profilePlaceHolderText
   * @param callType
   * @param shouldDisplayBadge
   */
  private renderImage(
    imageUrl: string | undefined,
    profilePlaceHolderText: string,
    callType: CallType,
    shouldDisplayBadge: boolean,
    isExternal: boolean,
  ): JSX.Element | undefined {
    let imgClass = 'default-logo';
    let url = '../renderer/assets/notification-symphony-logo.svg';
    let alt = 'Symphony Messaging logo';

    if (imageUrl) {
      imgClass = 'profile-picture';
      url = imageUrl;
      alt = 'Profile picture';
    }
    if (!imageUrl) {
      const profilePlaceHolderClassName =
        callType === 'IM'
          ? 'profilePlaceHolderContainer'
          : 'roomPlaceHolderContainer';
      return (
        <div className='logo'>
          <div
            className={classNames('thumbnail', profilePlaceHolderClassName, {
              external: isExternal,
            })}
          >
            <p className={'profilePlaceHolderText'}>{profilePlaceHolderText}</p>
          </div>
          {this.renderSymphonyBadge(shouldDisplayBadge, callType)}
        </div>
      );
    }

    return (
      <div className='logo'>
        <img className={imgClass} src={url} alt={alt} />
        {this.renderSymphonyBadge(shouldDisplayBadge)}
      </div>
    );
  }

  /**
   * Renders profile picture Symphony badge
   * @param hasImageUrl
   * @param callType
   */
  private renderSymphonyBadge(
    hasImageUrl: boolean,
    callType: CallType = 'IM',
  ): JSX.Element | undefined {
    const badgePositionClass =
      callType === 'IM' ? 'badge-position-im' : 'badge-position-room';
    if (hasImageUrl) {
      return (
        <img
          src='../renderer/assets/symphony-badge.svg'
          alt=''
          className={`profile-picture-badge ${badgePositionClass}`}
        />
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
}
