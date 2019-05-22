import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

const MORE_INFO_NAMESPACE = 'MoreInfo';
/**
 * Window that display app version and copyright info
 */
export default class MoreInfo extends React.PureComponent {

    /**
     * main render function
     */
    public render(): JSX.Element {
        return (
            <div className='MoreInfo'>
                <span><b>{i18n.t('Version Information', MORE_INFO_NAMESPACE)()}</b></span>
                <div className='content'>
                    <h4>Electron</h4>
                    <span className='MoreInfo-electron'>{process.versions.electron || 'N/A'}</span>
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
                            <td>{process.versions.chrome || 'N/A'}</td>
                            <td>{process.versions.v8 || 'N/A'}</td>
                            <td>{process.versions.node || 'N/A'}</td>
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
                            <td>{process.versions.openssl || 'N/A'}</td>
                            <td>{process.versions.zlib || 'N/A'}</td>
                            <td>{process.versions.uv || 'N/A'}</td>
                            <td>{process.versions.ares || 'N/A'}</td>
                            <td>{process.versions.http_parser || 'N/A'}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}
