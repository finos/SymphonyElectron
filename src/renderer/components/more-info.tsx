import * as React from 'react';

import { ipcRenderer } from 'electron';
import { i18n } from '../../common/i18n-preload';

interface IState {
    clientVersion: string;
    buildNumber: string;
    sdaVersion: string;
    sdaBuildNumber: string;
    electronVersion: string;
    chromeVersion: string;
    v8Version: string;
    nodeVersion: string;
    openSslVersion: string;
    zlibVersion: string;
    uvVersion: string;
    aresVersion: string;
    httpParserVersion: string;
    swiftSearchVersion: string;
    swiftSearchSupportedVersion: string;
}

const MORE_INFO_NAMESPACE = 'MoreInfo';

/**
 * Window that display app version and copyright info
 */
export default class MoreInfo extends React.Component<{}, IState> {

    constructor(props) {
        super(props);
        this.state = {
            clientVersion: 'N/A',
            buildNumber: 'N/A',
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

    public componentDidMount(): void {
        ipcRenderer.on('more-info-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('more-info-data', this.updateState);
    }

    /**
     * main render function
     */
    public render(): JSX.Element {
        const { clientVersion, buildNumber,
            sdaVersion, sdaBuildNumber,
            electronVersion, chromeVersion, v8Version,
            nodeVersion, openSslVersion, zlibVersion,
            uvVersion, aresVersion, httpParserVersion,
            swiftSearchVersion, swiftSearchSupportedVersion,
        } = this.state;

        const podVersion = `${clientVersion} (${buildNumber})`;
        const sdaVersionBuild = `${sdaVersion} (${sdaBuildNumber})`;
        return (
            <div className='MoreInfo'>
                <span><b>{i18n.t('Version Information', MORE_INFO_NAMESPACE)()}</b></span>
                <div className='content'>
                    <h4>Symphony</h4>
                    <table>
                        <tbody>
                            <tr>
                                <th>Pod Version</th>
                                <th>SDA Version</th>
                            </tr>
                            <tr>
                                <td>{podVersion || 'N/A'}</td>
                                <td>{sdaVersionBuild || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='content'>
                    <h4>Electron</h4>
                    <span className='MoreInfo-electron'>{electronVersion || 'N/A'}</span>
                </div>
                <div className='content'>
                    <h4>v8 {i18n.t('related', MORE_INFO_NAMESPACE)()}</h4>
                    <table>
                        <tbody>
                            <tr>
                                <th>Chrome</th>
                                <th>v8</th>
                                <th>Node</th>
                            </tr>
                            <tr>
                                <td>{chromeVersion || 'N/A'}</td>
                                <td>{v8Version || 'N/A'}</td>
                                <td>{nodeVersion || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='content'>
                    <h4>{i18n.t('Others', MORE_INFO_NAMESPACE)()}</h4>
                    <table>
                        <tbody>
                            <tr>
                                <th>openssl</th>
                                <th>zlib</th>
                                <th>uv</th>
                                <th>ares</th>
                                <th>http_parser</th>
                            </tr>
                            <tr>
                                <td>{openSslVersion || 'N/A'}</td>
                                <td>{zlibVersion || 'N/A'}</td>
                                <td>{uvVersion || 'N/A'}</td>
                                <td>{aresVersion || 'N/A'}</td>
                                <td>{httpParserVersion || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='content'>
                    <h4>Swift Search</h4>
                    <table>
                        <tbody>
                            <tr>
                                <th>{i18n.t('Swift Search Version', MORE_INFO_NAMESPACE)()}</th>
                                <th>{i18n.t('API Version', MORE_INFO_NAMESPACE)()}</th>
                            </tr>
                            <tr>
                                <td>{swiftSearchVersion || 'N/A'}</td>
                                <td>{swiftSearchSupportedVersion || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
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
