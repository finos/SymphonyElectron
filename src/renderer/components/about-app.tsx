import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';
import { productName } from '../../../package.json';
import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';
import * as CopyIcon from '../../renderer/assets/copy-icon.svg';
import * as SymphonyLogo from '../../renderer/assets/new-symphony-logo.svg';

const HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface IState {
  userConfig: object;
  globalConfig: object;
  cloudConfig: object;
  finalConfig: object;
  appName: string;
  copyWrite?: string;
  clientVersion: string;
  buildNumber: string;
  hostname: string;
  sfeVersion: string;
  sfeClientType: string;
  versionLocalised?: string;
  sdaVersion?: string;
  sdaBuildNumber?: string;
  electronVersion?: string;
  chromeVersion?: string;
  v8Version?: string;
  nodeVersion?: string;
  openSslVersion?: string;
  zlibVersion?: string;
  uvVersion?: string;
  aresVersion?: string;
  httpParserVersion?: string;
  swiftSearchVersion?: string;
  swiftSearchSupportedVersion?: string;
  client?: string;
  updatedHostname: string;
  isPodEditing: boolean;
  isValidHostname: boolean;
  didUpdateHostname: boolean;
}

const ABOUT_SYMPHONY_NAMESPACE = 'AboutSymphony';
const SFE_CLIENT_TYPE_NAME = 'SFE-Lite';

/**
 * Window that display app version and copyright info
 */
export default class AboutApp extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onCopy: () => this.copy(),
    onClose: () => this.close(),
    onPodClick: (event) => this.onPodClick(event),
    onPodChange: (event) => this.handlePodChange(event),
    onPodInputBlur: (event) => this.handlePodInputBlur(event),
  };
  private closeButtonRef: React.RefObject<HTMLButtonElement>;

  constructor(props) {
    super(props);
    this.closeButtonRef = React.createRef();
    this.state = {
      userConfig: {},
      globalConfig: {},
      cloudConfig: {},
      finalConfig: {},
      appName: 'Symphony',
      versionLocalised: 'Version',
      clientVersion: '',
      buildNumber: '',
      hostname: '',
      sfeVersion: '',
      sfeClientType: '',
      sdaVersion: '',
      sdaBuildNumber: '',
      electronVersion: '',
      chromeVersion: '',
      v8Version: '',
      nodeVersion: '',
      openSslVersion: '',
      zlibVersion: '',
      uvVersion: '',
      aresVersion: '',
      httpParserVersion: '',
      swiftSearchVersion: '',
      swiftSearchSupportedVersion: '',
      updatedHostname: '',
      isPodEditing: false,
      isValidHostname: true,
      didUpdateHostname: false,
    };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Renders the component
   */
  public render(): JSX.Element {
    const {
      clientVersion,
      buildNumber,
      hostname,
      sfeVersion,
      sdaVersion,
      sdaBuildNumber,
      client,
      didUpdateHostname,
      isValidHostname,
    } = this.state;

    const appName = productName || 'Symphony';
    const sfeVersionPrefix = 'sfe-lite-';
    const copyright = `${i18n.t(
      'Copyright',
      ABOUT_SYMPHONY_NAMESPACE,
    )()} \xA9 ${new Date().getFullYear()} ${appName}`;
    const podVersion = `${clientVersion} (${buildNumber})`;
    const sdaVersionBuild = `${sdaVersion} (${sdaBuildNumber})`;
    const formattedSfeVersion = sfeVersion?.includes(sfeVersionPrefix)
      ? sfeVersion.split(sfeVersionPrefix)[1]
      : sfeVersion;
    const symphonySectionItems = [
      {
        key: 'POD:',
        value: `${hostname || ''}`,
      },
      {
        key: 'SBE:',
        value: podVersion,
      },
      {
        key: 'SDA:',
        value: sdaVersionBuild,
      },
      {
        key: `${SFE_CLIENT_TYPE_NAME}:`,
        value: `${formattedSfeVersion} ${client}`,
      },
    ];
    const closeButtonText =
      isValidHostname && didUpdateHostname
        ? i18n.t('Save and Restart', ABOUT_SYMPHONY_NAMESPACE)()
        : i18n.t('Close', ABOUT_SYMPHONY_NAMESPACE)();

    return (
      <div className='AboutApp' lang={i18n.getLocale()}>
        <div className='AboutApp-header-container'>
          <img
            className='AboutApp-logo'
            src={SymphonyLogo}
            alt={i18n.t('Symphony Logo', ABOUT_SYMPHONY_NAMESPACE)()}
          />
        </div>
        <div className='AboutApp-main-container'>
          <div className='AboutApp-main-title'>
            <span>
              {i18n.t('Desktop Application', ABOUT_SYMPHONY_NAMESPACE)()}
            </span>
          </div>
          {sdaVersion ? this.renderVersions(symphonySectionItems) : null}
          <div className='AboutApp-copy-container'>
            <button
              className='AboutApp-copy-button'
              onClick={this.eventHandlers.onCopy}
              title={i18n.t(
                'Copy config to clipboard',
                ABOUT_SYMPHONY_NAMESPACE,
              )()}
              data-testid={'COPY_BUTTON'}
            >
              <img
                src={CopyIcon}
                alt={i18n.t('Symphony Logo', ABOUT_SYMPHONY_NAMESPACE)()}
              ></img>
              <span>
                {i18n.t('Copy config to clipboard', ABOUT_SYMPHONY_NAMESPACE)()}
              </span>
            </button>
          </div>
          <div className='AboutApp-close-container'>
            <button
              className='AboutApp-close-button'
              onClick={this.eventHandlers.onClose}
              title={closeButtonText}
              data-testid={'CLOSE_BUTTON'}
              ref={this.closeButtonRef}
            >
              {closeButtonText}
            </button>
          </div>
        </div>
        <div className='AboutApp-version-container'>
          <p className='AboutApp-copyright-text'>{copyright}</p>
        </div>
      </div>
    );
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    setTimeout(() => {
      this.closeButtonRef.current?.focus();
    }, 0);
    ipcRenderer.on('about-app-data', this.updateState);
  }

  /**
   * Callback to handle event when a component is unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener('about-app-data', this.updateState);
  }

  /**
   * Copies the version info on to the clipboard
   */
  public copy(): void {
    const { clientVersion, ...rest } = this.state;
    const { isPodEditing, isValidHostname, didUpdateHostname, ...data } = {
      ...{ sbeVersion: clientVersion },
      ...rest,
    };
    if (data) {
      ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.aboutAppClipBoardData,
        clipboard: data,
        clipboardType: 'clipboard',
      });
    }
  }

  /**
   * Close modal
   */
  public close(): void {
    const { isValidHostname, didUpdateHostname, hostname } = this.state;
    ipcRenderer.send('close-about-app');
    if (isValidHostname && didUpdateHostname) {
      ipcRenderer.send('user-pod-updated', hostname);
    }
  }

  /**
   * Enables editing mode
   */
  public onPodClick(e): void {
    if (e.detail === 3) {
      this.setState({
        isPodEditing: true,
        didUpdateHostname: true,
      });
    }
  }

  /**
   * Updates state with new POD URL
   * @param e
   */
  public handlePodChange = (e) => {
    const { value } = e.target;
    this.setState({ updatedHostname: value });
  };

  /**
   * Validates and sets new hostname
   */
  public handlePodInputBlur = (_event) => {
    const { updatedHostname, hostname } = this.state;
    if (!HOSTNAME_REGEX.test(updatedHostname)) {
      this.setState({
        isPodEditing: false,
        isValidHostname: false,
      });
    } else {
      this.setState({
        isPodEditing: false,
        isValidHostname: true,
        hostname: updatedHostname || hostname,
      });
    }
  };

  /**
   * Sets the component state
   *
   * @param _event
   * @param data {Object} { buildNumber, clientVersion, version }
   */
  private updateState(_event, data): void {
    const updatedData = { ...data, updatedHostname: data.hostname };
    this.setState(updatedData as IState);
  }

  /**
   * Renders component versions
   * @param symphonySectionItems
   */
  private renderVersions(symphonySectionItems): JSX.Element {
    return (
      <section>
        <ul className='AboutApp-symphony-section'>
          {symphonySectionItems.map((item, key) => {
            if (item.key === 'POD:') {
              return this.renderEditablePodElement(item, key);
            }
            return (
              <li key={key}>
                <strong>{item.key}</strong>
                <span>{item.value}</span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  private renderEditablePodElement = (item, key) => {
    const { isPodEditing, isValidHostname, updatedHostname } = this.state;
    return (
      <li key={key}>
        <strong className={'AboutApp-pod'}>{item.key}</strong>
        {isPodEditing ? (
          <input
            className={'AboutApp-pod-input'}
            type='text'
            value={updatedHostname}
            onChange={this.handlePodChange}
            onBlur={this.handlePodInputBlur}
            autoFocus
          />
        ) : (
          <span
            data-testid={'POD_INFO'}
            className={classNames({ 'invalid-pod': !isValidHostname })}
            onClick={this.eventHandlers.onPodClick}
          >
            {updatedHostname}
          </span>
        )}
      </li>
    );
  };
}
