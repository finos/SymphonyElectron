import classnames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';
import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';
interface IState {
  url: string;
  message: string;
  urlValid: boolean;
  isPodConfigured: boolean;
  isFirstTimeLaunch: boolean;
  isBrowserLoginEnabled: boolean;
  browserLoginAutoConnect: boolean;
  isLoading: boolean;
  isRetryInProgress: boolean;
  retryFailed: boolean;
}

const WELCOME_NAMESPACE = 'Welcome';
const DEFAULT_MESSAGE = 'Find your pod URL in your invitation email.';
const DEFAULT_POD_URL = 'https://[POD].symphony.com';
const BROWSER_LOGIN_AUTO_REDIRECT_TIMEOUT = 2000;

export default class Welcome extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onLogin: () => this.login(),
  };

  private browserLoginTimeoutId: NodeJS.Timeout | undefined;

  constructor(props) {
    super(props);
    this.state = {
      url: DEFAULT_POD_URL,
      message: '',
      urlValid: false,
      isPodConfigured: false,
      isFirstTimeLaunch: false,
      isBrowserLoginEnabled: true,
      browserLoginAutoConnect: false,
      isLoading: false,
      isRetryInProgress: false,
      retryFailed: false,
    };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Render the component
   */
  public render(): JSX.Element {
    const {
      url,
      message,
      isPodConfigured,
      isLoading,
      isBrowserLoginEnabled,
      isFirstTimeLaunch,
      isRetryInProgress,
      retryFailed,
    } = this.state;
    return (
      <div className='Welcome' lang={i18n.getLocale()}>
        <div className='Welcome-content'>
          <div className='Welcome-image-container'>
            {this.getWelcomeImage()}
          </div>
          {isPodConfigured && (
            <React.Fragment>
              <span className='Welcome-welcome-back'>
                {i18n.t('Welcome back!', WELCOME_NAMESPACE)()}
              </span>
            </React.Fragment>
          )}
          {(!isPodConfigured || isFirstTimeLaunch) && (
            <React.Fragment>
              <div
                className='Welcome-about-symphony-text'
                style={{ marginTop: isPodConfigured ? '35px' : '24px' }}
              >
                <span>
                  {i18n.t(
                    'Welcome to the largest global community in financial services with over',
                    WELCOME_NAMESPACE,
                  )()}
                </span>
                <span className='Welcome-text-bold'>
                  {i18n.t(' half a million users', WELCOME_NAMESPACE)()}
                </span>
                <span>{i18n.t(' and more than', WELCOME_NAMESPACE)()}</span>
                <span className='Welcome-text-bold'>
                  {i18n.t(' 1,000 institutions.', WELCOME_NAMESPACE)()}
                </span>
              </div>
              <div className='Welcome-login-text'>
                <span>
                  {i18n.t('Log in with your pod URL', WELCOME_NAMESPACE)()}
                </span>
              </div>
              <div className='Welcome-input-container'>
                <span>{i18n.t('Pod URL', WELCOME_NAMESPACE)()}</span>
                <div>
                  <input
                    disabled={isLoading}
                    data-testid={'Welcome-main-container-podurl-box'}
                    className='Welcome-main-container-podurl-box'
                    type='url'
                    value={url}
                    onChange={this.updatePodUrl.bind(this)}
                  />
                  <label className='Welcome-input-message'>
                    {message
                      ? message
                      : i18n.t(DEFAULT_MESSAGE, WELCOME_NAMESPACE)()}
                  </label>
                </div>
              </div>
            </React.Fragment>
          )}

          {this.renderLoginButton()}

          {isBrowserLoginEnabled && (
            <div className='Welcome-redirect-info-text-container'>
              <span>
                {this.getConnectionStatusMessage(
                  isRetryInProgress,
                  retryFailed,
                )}
              </span>
              {isLoading && (
                <button
                  className='Welcome-retry-button'
                  onClick={this.eventHandlers.onLogin}
                  disabled={isRetryInProgress}
                >
                  {i18n.t('Retry', WELCOME_NAMESPACE)()}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * Perform actions on component being mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('welcome', (_event, data) => {
      if (
        data.isPodConfigured &&
        data.browserLoginAutoConnect &&
        data.isBrowserLoginEnabled
      ) {
        this.browserLoginTimeoutId = setTimeout(() => {
          this.login();
        }, BROWSER_LOGIN_AUTO_REDIRECT_TIMEOUT);
      }
      this.updateState(_event, data);
    });
  }

  /**
   * Perform actions on component being unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener('welcome', this.updateState);
  }

  /**
   * Handle seamless login
   */
  public login(): void {
    this.setState({ isLoading: true });
    const {
      url,
      isPodConfigured,
      isBrowserLoginEnabled,
      browserLoginAutoConnect,
    } = this.state;
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.browserLogin,
      newPodUrl: url,
      isPodConfigured,
      isBrowserLoginEnabled,
      browserLoginAutoConnect,
    });
  }

  /**
   * Update pod url from the text box
   * @param _event
   */
  public updatePodUrl(_event): void {
    const url = _event.target.value.trim();
    const match =
      url.match(
        /^https:\/\/.(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/g,
      ) != null;
    if (url === 'https://[POD].symphony.com' || !match) {
      this.updateState(_event, {
        url,
        message: i18n.t('Please enter a valid url', WELCOME_NAMESPACE)(),
        urlValid: false,
      });
      return;
    }
    this.updateState(_event, {
      url,
      message: '',
      urlValid: true,
    });
  }

  /**
   * Update pod url from the text box
   * @param event
   */
  public updateBrowserLoginAutoConnect(event) {
    const { urlValid } = this.state;
    const browserLoginAutoConnect = event.target.checked;
    if (browserLoginAutoConnect) {
      if (urlValid) {
        this.setState({
          browserLoginAutoConnect,
          isLoading: true,
        });
        const { url, isPodConfigured, isBrowserLoginEnabled } = this.state;
        ipcRenderer.send(apiName.symphonyApi, {
          cmd: apiCmds.browserLogin,
          newPodUrl: url,
          isPodConfigured,
          isBrowserLoginEnabled,
          browserLoginAutoConnect,
        });
        return;
      }
    }
    if (this.browserLoginTimeoutId) {
      clearTimeout(this.browserLoginTimeoutId);
    }
    this.setState({
      browserLoginAutoConnect,
    });
  }

  /**
   * Renders login button content
   */
  private renderLoginButton() {
    const {
      isLoading,
      isPodConfigured,
      urlValid,
      isBrowserLoginEnabled,
      browserLoginAutoConnect,
    } = this.state;
    const loginButtonClasses = classnames('Welcome-continue-button', {
      'Welcome-continue-button-loading': isLoading,
    });
    return (
      <React.Fragment>
        {isBrowserLoginEnabled && (
          <div className='Welcome-auto-connect-wrapper'>
            <label className='switch'>
              <input
                type='checkbox'
                disabled={isLoading}
                checked={browserLoginAutoConnect}
                onChange={this.updateBrowserLoginAutoConnect.bind(this)}
              />
              <span className='slider round'></span>
            </label>
            <div className='auto-connect-labels'>
              <span className='auto-connect-label'>
                {i18n.t(
                  'Automatically redirect to your web browser on launch',
                  WELCOME_NAMESPACE,
                )()}
              </span>
            </div>
          </div>
        )}

        <button
          className={loginButtonClasses}
          disabled={(!isPodConfigured && !urlValid) || isLoading}
          onClick={this.eventHandlers.onLogin}
          style={isPodConfigured ? { marginTop: '24px' } : {}}
        >
          {isLoading && (
            <div className='splash-screen--spinner-container'>
              <div
                className='splash-screen--spinner'
                role='progressbar'
                data-testid='SPLASH_SCREEN_SPINNER'
              >
                <svg viewBox='22 22 44 44'>
                  <circle
                    className='splash-screen--spinner-circle'
                    cx='44'
                    cy='44'
                    r='20.2'
                    fill='none'
                    stroke-width='3.6'
                  ></circle>
                </svg>
              </div>
            </div>
          )}
          {!isLoading && i18n.t('log in', WELCOME_NAMESPACE)()}
        </button>
      </React.Fragment>
    );
  }

  /**
   * Update state
   * @param _event
   * @param data
   */
  private updateState(_event, data): void {
    this.setState(data as IState);
  }

  /**
   * Returns welcome screen symphony image
   */
  private getWelcomeImage() {
    return (
      <img
        className='Welcome-symphony-image'
        src={`../renderer/assets/welcome-symphony-logo.svg`}
        alt={i18n.t('symphony messaging logo')()}
      />
    );
  }

  /**
   * Gets the appropriate connection status message based on retry status.
   * @param {boolean} isRetryInProgress Whether a retry is currently in progress.
   * @param {boolean} retryFailed Whether the retry attempt failed.
   * @returns {string} The connection status message.
   */
  private getConnectionStatusMessage = (
    isRetryInProgress: boolean,
    retryFailed: boolean,
  ): string => {
    if (isRetryInProgress) {
      return i18n.t('Establishing a secure connection.', WELCOME_NAMESPACE)();
    } else if (retryFailed) {
      return i18n.t(
        'Unable to establish a secure connection.',
        WELCOME_NAMESPACE,
      )();
    } else {
      return i18n.t(
        'You’ll momentarily be redirected to your web browser.',
        WELCOME_NAMESPACE,
      )();
    }
  };
}
