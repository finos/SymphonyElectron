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
                style={{ marginTop: isPodConfigured ? '35px' : '8px' }}
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
                {i18n.t(
                  'You’ll momentarily be redirected to your web browser.',
                  WELCOME_NAMESPACE,
                )()}
              </span>
              {isLoading && (
                <button
                  className='Welcome-retry-button'
                  onClick={this.eventHandlers.onLogin}
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
      <svg
        width='296'
        height='70'
        viewBox='0 0 296 70'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          // tslint:disable-next-line: max-line-length
          d='M44.0497 27.1163V18.546C44.0497 16.7907 43.1018 15.1409 41.5765 14.2407C39.2929 12.8926 34.3464 10.6321 26.8796 10.6321C19.4127 10.6321 14.4663 12.8926 12.1826 14.2407C10.6573 15.1409 9.70941 16.7907 9.70941 18.546V31.4166L36.8955 39.3004V45.034C36.8955 45.8102 36.409 46.3542 35.582 46.7584L26.8796 51.126L18.1321 46.7362C17.3501 46.3542 16.8636 45.8102 16.8636 45.034V40.7338L9.70941 38.5836V45.034C9.70941 48.5753 11.7369 51.5883 14.9563 53.1579L26.8796 59.3681L38.7585 53.1801C42.0222 51.5883 44.0497 48.5753 44.0497 45.034V34.2834L16.8636 26.3996V19.8554C18.806 18.9165 22.1177 17.7991 26.8796 17.7991C31.6414 17.7991 34.9531 18.9165 36.8955 19.8554V24.9662L44.0497 27.1163Z'
          fill='#008EFF'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M79.6153 47.1841C75.3165 47.1841 71.6321 45.7833 68.3233 43.6982L70.3703 40.5877C73.6791 42.7072 76.7152 43.7326 80.1269 43.7326C84.1189 43.7326 85.9951 42.1941 85.9951 40.3832C85.9951 35.1886 69.1076 38.2981 69.1076 30.0275C69.1076 25.9949 73.1336 22.8167 79.6153 22.8167C83.9821 22.8167 87.7685 24.4574 89.9863 26.6782L87.4617 29.2764C85.5515 27.6013 82.6174 26.2682 79.5474 26.2682C75.7601 26.2682 73.2016 27.6357 73.2016 29.5832C73.2016 34.4022 90.1231 31.8393 90.1231 39.9733C90.1231 44.2792 85.7903 47.1841 79.6153 47.1841Z'
          fill='#F8F8F8'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M106.67 37.2388V46.3637H102.576V37.2044L92.3418 23.6025H97.1172L104.794 34.1283L112.061 23.6025H116.768L106.67 37.2388Z'
          fill='#F8F8F8'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M145.324 46.3637V28.5238L144.198 30.9501L136.146 46.3637H133.69L125.742 30.9501L124.616 28.5238V46.3637H120.692V23.6025H126.389L134.031 38.913L135.089 41.237L136.146 38.913L143.686 23.6025H149.315V46.3637H145.324Z'
          fill='#F8F8F8'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M171.582 30.3695C171.582 28.4899 170.32 27.089 167.216 27.089H159.676V34.4365H167.386C170.49 34.4365 171.582 32.9324 171.582 31.0871V30.3695ZM166.772 37.7859H159.676V46.3642H155.582V23.603H166.772C172.981 23.603 175.71 26.4048 175.71 30.3695V30.9849C175.71 34.9487 172.981 37.7859 166.772 37.7859Z'
          fill='#F8F8F8'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M198.016 46.3637V36.5555H184.335V46.3637H180.242V23.6025H184.335V33.2406H198.016V23.6025H202.11V46.3637H198.016Z'
          fill='#F8F8F8'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M226.83 33.5818C226.83 29.6858 224.135 26.3365 219.155 26.3365C214.173 26.3365 211.512 29.6858 211.512 33.5818V36.3501C211.512 40.246 214.173 43.6642 219.155 43.6642C224.135 43.6642 226.83 40.246 226.83 36.3501V33.5818ZM219.154 47.1837C211.853 47.1837 207.383 41.9891 207.383 36.419V33.5818C207.383 27.9085 211.853 22.8162 219.154 22.8162C226.488 22.8162 230.957 27.9085 230.957 33.5818V36.419C230.957 41.9891 226.488 47.1837 219.154 47.1837Z'
          fill='#F8F8F8'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M254.595 46.3637L241.87 31.9754L240.232 29.8569V46.3637H236.172V23.6025H239.959L252.275 38.0252L253.946 40.1438V23.6025H257.972V46.3637H254.595Z'
          fill='#F8F8F8'
        />
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M276.192 37.2388V46.3637H272.098V37.2044L261.864 23.6025H266.64L274.316 34.1283L281.583 23.6025H286.29L276.192 37.2388Z'
          fill='#F8F8F8'
        />
      </svg>
    );
  }
}
