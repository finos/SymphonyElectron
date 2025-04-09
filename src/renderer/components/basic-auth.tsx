import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

interface IState {
  hostname: string;
  isValidCredentials: boolean;
  password?: string;
  username?: string;
}

const BASIC_AUTH_NAMESPACE = 'BasicAuth';

/**
 * Window that display app version and copyright info
 */
export default class BasicAuth extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onChange: (event) => this.change(event),
    onSubmit: (event) => this.submit(event),
    onClose: () => this.close(),
  };

  constructor(props) {
    super(props);
    this.state = {
      hostname: 'unknown',
      isValidCredentials: true,
    };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('basic-auth-data', this.updateState);
  }

  /**
   * Callback to handle event when a component is unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener('basic-auth-data', this.updateState);
  }

  /**
   * Renders the component
   */
  public render(): JSX.Element {
    const { hostname, isValidCredentials } = this.state;
    const shouldShowError = classNames('credentials-error', {
      'display-error': !isValidCredentials,
    });
    return (
      <div className='container' lang={i18n.getLocale()}>
        <span>
          {i18n.t(
            'Please provide your login credentials for:',
            BASIC_AUTH_NAMESPACE,
          )()}
        </span>
        {hostname && <span className='hostname'>{hostname}</span>}
        <span id='credentialsError' className={shouldShowError}>
          {i18n.t('Invalid user name/password', BASIC_AUTH_NAMESPACE)()}
        </span>
        <form
          id='basicAuth'
          name='Basic Auth'
          action='Login'
          onSubmit={this.eventHandlers.onSubmit}
        >
          <table className='form'>
            <tbody>
              <tr>
                <td id='username-text'>
                  {i18n.t('User name:', BASIC_AUTH_NAMESPACE)()}
                </td>
                <td>
                  <input
                    id='username'
                    name='username'
                    title='Username'
                    onChange={this.eventHandlers.onChange}
                    required
                  />
                </td>
              </tr>
              <tr>
                <td id='password-text'>
                  {i18n.t('Password:', BASIC_AUTH_NAMESPACE)()}
                </td>
                <td>
                  <input
                    name='password'
                    id='password'
                    type='password'
                    title='Password'
                    onChange={this.eventHandlers.onChange}
                    required
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <div className='footer'>
            <div className='button-container'>
              <button type='submit' id='login'>
                {i18n.t('Log In', BASIC_AUTH_NAMESPACE)()}
              </button>
            </div>
            <div className='button-container'>
              <button
                type='button'
                id='cancel'
                onClick={this.eventHandlers.onClose}
              >
                {i18n.t('Cancel', BASIC_AUTH_NAMESPACE)()}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  /**
   * Sets states on input changes
   *
   * @param event
   */
  private change(event): void {
    const { id, value } = event.target as HTMLInputElement;
    this.setState((prevState) => ({ ...prevState, [id]: value }));
  }

  /**
   * Submits the form with provided username and password info
   */
  private submit(event): void {
    event.preventDefault();
    const { username, password } = this.state;
    if (username && password) {
      ipcRenderer.send('basic-auth-login', { username, password });
    }
  }

  /**
   * closes the auth window
   */
  private close(): void {
    ipcRenderer.send('basic-auth-closed', false);
  }

  /**
   * Sets the component state
   *
   * @param _event
   * @param data {Object} { hostname, isValidCredentials }
   */
  private updateState(_event, data): void {
    this.setState(data as IState);
  }
}
