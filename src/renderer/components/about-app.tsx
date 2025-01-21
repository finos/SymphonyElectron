import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';
import { productName } from '../../../package.json';
import { IConfig } from '../../app/config-handler';
import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';
import * as CopyIcon from '../../renderer/assets/copy-icon.svg';
import * as SymphonyLogo from '../../renderer/assets/new-symphony-logo.svg';

const HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface IState {
  userConfig: object;
  globalConfig: object;
  cloudConfig: object;
  finalConfig: IConfig;
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
  updatedHostname?: string;
  isPodEditing: boolean;
  isValidHostname: boolean;
}

const ABOUT_SYMPHONY_NAMESPACE = 'AboutSymphony';
const SFE_CLIENT_TYPE_NAME = 'SFE-Lite';
const KEY_CODE = {
  ENTER: 13,
  ESCAPE: 27,
  SPACE: 32,
};

/**
 * Window that display app version and copyright info
 */
export default class AboutApp extends React.Component<{}, IState> {
  private readonly eventHandlers = {
    onCopy: () => this.copy(),
    onClose: () => this.close(),
    onCancel: () => this.cancel(),
    onPodClick: (event) => this.onPodClick(event),
    onPodChange: (event) => this.handlePodChange(event),
    onPodInputBlur: (event) => this.handlePodInputBlur(event),
  };
  private closeButtonRef: React.RefObject<HTMLButtonElement>;
  private previousUrl: string = '';

  constructor(props) {
    super(props);
    this.closeButtonRef = React.createRef();
    this.state = {
      userConfig: {},
      globalConfig: {},
      cloudConfig: {},
      finalConfig: {} as IConfig,
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
    const finalConfig = this.state.finalConfig?.url
      ?.replace(/https:\/\//g, '')
      ?.split('/')[0];
    const updatedHostname = this.state.updatedHostname
      ?.replace(/https:\/\//g, '')
      ?.split('/')[0];
    const isHostNamechanged =
      finalConfig && updatedHostname && finalConfig !== updatedHostname;
    const closeButtonText = isHostNamechanged
      ? i18n.t('Save and Restart', ABOUT_SYMPHONY_NAMESPACE)()
      : i18n.t('Close', ABOUT_SYMPHONY_NAMESPACE)();
    const cancelText = i18n.t('Cancel', ABOUT_SYMPHONY_NAMESPACE)();

    return (
      <div className='AboutApp' lang={i18n.getLocale()}>
        <div className='AboutApp-header-container'>
          <img
            className='AboutApp-logo'
            src={SymphonyLogo}
            alt={i18n.t('Symphony Messaging Logo', ABOUT_SYMPHONY_NAMESPACE)()}
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
                alt={i18n.t(
                  'Symphony Messaging Logo',
                  ABOUT_SYMPHONY_NAMESPACE,
                )()}
              ></img>
              <span>
                {i18n.t('Copy config to clipboard', ABOUT_SYMPHONY_NAMESPACE)()}
              </span>
            </button>
          </div>
          <div className='AboutApp-close-container'>
            {this.state.isPodEditing && (
              <button
                className={
                  isHostNamechanged
                    ? 'AboutApp-cancel-button-save-restart'
                    : 'AboutApp-cancel-button'
                }
                onMouseDown={this.eventHandlers.onCancel}
                title={cancelText}
                data-testid={'CANCEL_BUTTON'}
                onKeyDown={this.onCancelKeyDown}
              >
                {cancelText}
              </button>
            )}
            <button
              className={
                isHostNamechanged && isValidHostname
                  ? 'AboutApp-button-save-restart'
                  : !isValidHostname
                  ? 'AboutApp-button-save-restart-disabled'
                  : 'AboutApp-close-button'
              }
              onMouseDown={this.eventHandlers.onClose}
              title={closeButtonText}
              data-testid={'CLOSE_BUTTON'}
              ref={this.closeButtonRef}
              disabled={!isValidHostname}
              onKeyDown={this.onCloseKeyDown}
            >
              <span
                className={classNames({
                  'AboutApp-button-save-restart-text': isHostNamechanged,
                })}
              >
                {closeButtonText}
              </span>
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
    const { isPodEditing, isValidHostname, ...data } = {
      ...{ sbeVersion: clientVersion },
      ...rest,
    };
    if (data) {
      delete data.updatedHostname;
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
    const { isValidHostname } = this.state;
    const finalConfig = this.state.finalConfig?.url
      .replace(/https:\/\//g, '')
      ?.split('/')[0];
    const updatedHostname = this.state.updatedHostname
      ?.replace(/https:\/\//g, '')
      ?.split('/')[0];
    const compareHostName =
      finalConfig && updatedHostname && finalConfig !== updatedHostname;

    if (isValidHostname && compareHostName) {
      ipcRenderer.send('user-pod-updated', this.state.updatedHostname);
    }
    ipcRenderer.send('close-about-app');
  }

  /**
   * Cancel modal and restore old url
   */
  public cancel(): void {
    this.setState({
      updatedHostname: this.previousUrl,
      isPodEditing: false,
      isValidHostname: true,
      hostname: this.previousUrl,
    });
  }

  /**
   * Enables editing mode
   */
  public onPodClick(e): void {
    if (e.detail === 3) {
      this.setState({
        isPodEditing: !!(this.state.globalConfig as IConfig)?.isPodUrlEditable,
      });
    }
  }

  /**
   * Updates state with new POD URL
   * @param e
   */
  public handlePodChange = (e) => {
    const { value } = e.target;
    this.setState({
      updatedHostname: value,
      isValidHostname: HOSTNAME_REGEX.test(value || ''),
    });
  };

  /**
   * Handles key down on input
   * @param e
   */
  public onKeyDown = (e) => {
    if (e.keyCode === KEY_CODE.ENTER) {
      if (!this.state.isValidHostname) {
        return;
      }
      const { value } = e.target;
      this.setState({ updatedHostname: value });
      this.handlePodInputBlur(e);
      this.previousUrl = value;
    }
    if (e.keyCode === KEY_CODE.ESCAPE) {
      this.setState({
        updatedHostname: this.previousUrl,
        isPodEditing: false,
        isValidHostname: true,
        hostname: this.previousUrl,
      });
    }
  };
  /**
   * Handles handle keydown on Close
   * @param e
   */
  public onCloseKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.keyCode === KEY_CODE.ENTER || e.keyCode === KEY_CODE.SPACE) {
      this.close();
    }
  };

  /**
   * Handles key down on Cancel
   * @param e
   */
  public onCancelKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.keyCode === KEY_CODE.ENTER || e.keyCode === KEY_CODE.SPACE) {
      this.cancel();
    }
  };

  /**
   * Validates and sets new hostname
   */
  public handlePodInputBlur = (_event) => {
    const { updatedHostname, hostname } = this.state;
    if (!this.state.isValidHostname) {
      return;
    }
    if (!HOSTNAME_REGEX.test(updatedHostname || '')) {
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
    this.previousUrl = data.hostname;
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
            data-testid={'POD_INFO_INPUT'}
            className={'AboutApp-pod-input'}
            type='text'
            value={updatedHostname}
            onKeyDown={this.onKeyDown}
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
