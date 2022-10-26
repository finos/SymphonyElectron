import { ipcRenderer } from 'electron';
import * as React from 'react';
import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';

interface IState {
  url: string;
  message: string;
  urlValid: boolean;
  isPodConfigured: boolean;
  isSeamlessLoginEnabled: boolean;
}

const WELCOME_NAMESPACE = 'Welcome';
const DEFAULT_MESSAGE = 'Find your pod URL in your invitation email.';
const HEIGHT_WITH_POD_INPUT = '494px';
const HEIGHT_WITHOUT_POD_INPUT = '376px';
const DEFAULT_POD_URL = 'https://[POD].symphony.com';

export default class Welcome extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onLogin: () => this.login(),
  };

  constructor(props) {
    super(props);
    this.state = {
      url: DEFAULT_POD_URL,
      message: '',
      urlValid: false,
      isPodConfigured: false,
      isSeamlessLoginEnabled: true,
    };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Render the component
   */
  public render(): JSX.Element {
    const { url, message, urlValid, isPodConfigured } = this.state;
    return (
      <div
        className='Welcome'
        style={{
          height: isPodConfigured
            ? HEIGHT_WITHOUT_POD_INPUT
            : HEIGHT_WITH_POD_INPUT,
        }}
        lang={i18n.getLocale()}
      >
        <div className='Welcome-content'>
          <div className='Welcome-image-container'>
            <img
              src='../renderer/assets/welcome-symphony-logo.svg'
              alt={i18n.t('Symphony Logo', WELCOME_NAMESPACE)()}
            />
          </div>
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
          {!isPodConfigured && (
            <div>
              <div className='Welcome-login-text'>
                <span>
                  {i18n.t('Log in with your pod URL', WELCOME_NAMESPACE)()}
                </span>
              </div>
              <div className='Welcome-input-container'>
                <span>{i18n.t('Pod URL', WELCOME_NAMESPACE)()}</span>
                <div>
                  <input
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
            </div>
          )}
          <button
            className='Welcome-continue-button'
            disabled={!isPodConfigured && !urlValid}
            onClick={this.eventHandlers.onLogin}
            style={isPodConfigured ? { marginTop: '40px' } : {}}
          >
            {i18n.t('log in', WELCOME_NAMESPACE)()}
          </button>
          <div className='Welcome-redirect-info-text-container'>
            <span>
              {i18n.t(
                'You’ll momentarily be redirected to your web browser.',
                WELCOME_NAMESPACE,
              )()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Perform actions on component being mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('welcome', this.updateState);
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
    const { url, isPodConfigured, isSeamlessLoginEnabled } = this.state;
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.seamlessLogin,
      newPodUrl: url,
      isPodConfigured,
      isSeamlessLoginEnabled,
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
        /(https?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/g,
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
   * Update state
   * @param _event
   * @param data
   */
  private updateState(_event, data): void {
    this.setState(data as IState);
  }
}
