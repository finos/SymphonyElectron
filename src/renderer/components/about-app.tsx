import { ipcRenderer, remote } from 'electron';
import * as React from 'react';
import { i18n } from '../../common/i18n-preload';

interface IState {
    appName: string;
    copyWrite?: string;
    clientVersion: string;
    buildNumber: string;
    sfeVersion: string;
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
            appName: 'Symphony',
            versionLocalised: 'Version',
            clientVersion: 'N/A',
            buildNumber: 'N/A',
            sfeVersion: 'N/A',
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
     * main render function
     */
    public render(): JSX.Element {
        const { clientVersion, buildNumber, sfeVersion,
            sdaVersion, sdaBuildNumber,
            electronVersion, chromeVersion, v8Version,
            nodeVersion, openSslVersion, zlibVersion,
            uvVersion, aresVersion, httpParserVersion,
            swiftSearchVersion, swiftSearchSupportedVersion,
        } = this.state;

        const appName = remote.app.getName() || 'Symphony';
        const copyright = `\xA9 ${new Date().getFullYear()} ${appName}`;
        const podVersion = `${clientVersion} (${buildNumber})`;
        const sdaVersionBuild = `${sdaVersion} (${sdaBuildNumber})`;
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
                <hr />
                <div className='AboutApp-main-container'>
                    <section>
                        <h4>Symphony</h4>
                        <ul className='AboutApp-symphony-section'>
                            <li><b>SBE:</b> {podVersion}</li>
                            <li><b>SFE:</b> {sfeVersion}</li>
                            <li><b>SDA:</b> {sdaVersionBuild}</li>
                        </ul>
                    </section>
                    <section>
                        <h4>Electron</h4>
                        <ul className='AboutApp-electron-section'>
                            <li><b>Electron:</b> {electronVersion}</li>
                            <li><b>Chrome:</b> {chromeVersion}</li>
                            <li><b>V8:</b> {v8Version}</li>
                            <li><b>Node:</b> {nodeVersion}</li>
                        </ul>
                    </section>
                    <section>
                        <h4>{i18n.t('Others', ABOUT_SYMPHONY_NAMESPACE)()}</h4>
                        <ul className='AboutApp-others-section'>
                            <li><b>openssl:</b> {openSslVersion}</li>
                            <li><b>zlib:</b> {zlibVersion}</li>
                            <li><b>uv:</b> {uvVersion}</li>
                            <li><b>ares:</b> {aresVersion}</li>
                            <li><b>http_parser:</b> {httpParserVersion}</li>
                            <li><b>{i18n.t('Swift Search', ABOUT_SYMPHONY_NAMESPACE)()}:</b> {swiftSearchVersion}</li>
                            <li><b>{i18n.t('Swift Search API', ABOUT_SYMPHONY_NAMESPACE)()}:</b> {swiftSearchSupportedVersion}</li>
                        </ul>
                    </section>
                </div>
                <hr />
                <div>
                    <button
                        className='AboutApp-copy-button'
                        onClick={this.eventHandlers.onCopy}
                        title={i18n.t('Copy all the version information in this page', ABOUT_SYMPHONY_NAMESPACE)()}
                    >{i18n.t('Copy', ABOUT_SYMPHONY_NAMESPACE)()}</button>
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        ipcRenderer.on('about-app-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('about-app-data', this.updateState);
    }

    /**
     * Copies the version info on to the clipboard
     */
    public copy(): void {
        const data = this.state;
        if (data) {
            remote.clipboard.write({ text: JSON.stringify(data) }, 'clipboard' );
        }
    }

    /**
     * Sets the About app state
     *
     * @param _event
     * @param data {Object} { buildNumber, clientVersion, version }
     */
    private updateState(_event, data): void {
        this.setState(data as IState);
    }
}
