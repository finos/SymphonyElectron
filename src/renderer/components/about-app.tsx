import { ipcRenderer } from 'electron';
import * as React from 'react';
import { productName } from '../../../package.json';
import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';
import * as CopyIcon from '../../renderer/assets/copy-icon.svg';
import * as SymphonyLogo from '../../renderer/assets/new-symphony-logo.svg';
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
  };

  constructor(props) {
    super(props);
    this.state = {
      userConfig: {},
      globalConfig: {},
      cloudConfig: {},
      finalConfig: {},
      appName: 'Symphony',
      versionLocalised: 'Version',
      clientVersion: 'N/A',
      buildNumber: 'N/A',
      hostname: 'N/A',
      sfeVersion: 'N/A',
      sfeClientType: 'N/A',
      sdaVersion: 'N/A',
      sdaBuildNumber: 'N/A',
      electronVersion: 'N/A',
      chromeVersion: 'N/A',
      v8Version: 'N/A',
      nodeVersion: 'N/A',
      openSslVersion: 'N/A',
      zlibVersion: 'N/A',
      uvVersion: 'N/A',
      aresVersion: 'N/A',
      httpParserVersion: 'N/A',
      swiftSearchVersion: 'N/A',
      swiftSearchSupportedVersion: 'N/A',
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
    } = this.state;

    const appName = productName || 'Symphony';
    const copyright = `${i18n.t(
      'Copyright',
      ABOUT_SYMPHONY_NAMESPACE,
    )()} \xA9 ${new Date().getFullYear()} ${appName}`;
    const podVersion = `${clientVersion} (${buildNumber})`;
    const sdaVersionBuild = `${sdaVersion} (${sdaBuildNumber})`;
    const symphonySectionItems = [
      {
        key: 'POD:',
        value: `${hostname || 'N/A'}`,
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
        value: `${sfeVersion} ${client}`,
      },
    ];

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
          <section>
            <ul className='AboutApp-symphony-section'>
              {symphonySectionItems.map((item, key) => (
                <li key={key}>
                  <strong>{item.key}</strong>
                  <span>{item.value}</span>
                </li>
              ))}
            </ul>
          </section>
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
              title={i18n.t('Close', ABOUT_SYMPHONY_NAMESPACE)()}
              data-testid={'CLOSE_BUTTON'}
            >
              {i18n.t('Close', ABOUT_SYMPHONY_NAMESPACE)()}
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
    const data = { ...{ sbeVersion: clientVersion }, ...rest };
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
    ipcRenderer.send('close-about-app');
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
