import { ipcRenderer } from 'electron';
import * as React from 'react';
import { productName } from '../../../package.json';
import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';
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

/**
 * Window that display app version and copyright info
 */
export default class AboutApp extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onCopy: () => this.copy(),
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
      sfeClientType,
      sdaVersion,
      sdaBuildNumber,
      client,
    } = this.state;

    const appName = productName || 'Symphony';
    const copyright = `\xA9 ${new Date().getFullYear()} ${appName}`;
    const podVersion = `${clientVersion} (${buildNumber})`;
    const sdaVersionBuild = `${sdaVersion} (${sdaBuildNumber})`;
    let sfeClientTypeName = 'SFE';
    if (sfeClientType !== '1.5') {
      sfeClientTypeName = 'SFE-Lite';
    }

    return (
      <div className='AboutApp' lang={i18n.getLocale()}>
        <div className='AboutApp-header-container'>
          <div className='AboutApp-image-container'>
            <img
              className='AboutApp-logo'
              src='../renderer/assets/symphony-logo.png'
              alt={i18n.t('Symphony Logo', ABOUT_SYMPHONY_NAMESPACE)()}
            />
          </div>
          <div className='AboutApp-header-content'>
            <h1 className='AboutApp-name'>{appName}</h1>
            <p className='AboutApp-copyrightText'>{copyright}</p>
          </div>
        </div>
        <div className='AboutApp-main-container'>
          <section>
            <ul className='AboutApp-symphony-section'>
              <li>
                <b>POD:</b> {hostname || 'N/A'}
              </li>
              <li>
                <b>SBE:</b> {podVersion}
              </li>
              <li>
                <b>SDA:</b> {sdaVersionBuild}
              </li>
              <li>
                <b>{sfeClientTypeName}:</b> {sfeVersion} {client}
              </li>
            </ul>
          </section>
        </div>
        <div>
          <button
            className='AboutApp-copy-button'
            onClick={this.eventHandlers.onCopy}
            title={i18n.t(
              'Copy all the version information in this page',
              ABOUT_SYMPHONY_NAMESPACE,
            )()}
          >
            {i18n.t('Copy', ABOUT_SYMPHONY_NAMESPACE)()}
          </button>
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
   * Sets the component state
   *
   * @param _event
   * @param data {Object} { buildNumber, clientVersion, version }
   */
  private updateState(_event, data): void {
    this.setState(data as IState);
  }
}
