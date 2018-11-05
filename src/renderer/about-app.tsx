import { remote } from 'electron';
import * as React from 'react';

interface IProps {
    appName: string | undefined;
    copyWrite: string | undefined;
    clientVersion: string | undefined;
    buildNumber: string | undefined;
    version: string | undefined;
}

/**
 * Window that display app version and copyright info
 */
export default class AboutBox extends React.PureComponent<IProps, {}> {

    /**
     * main render function
     */
    public render() {
        const { clientVersion, version, buildNumber } = this.props;
        const appName = remote.app.getName() || 'Symphony';
        const versionString = `Version ${clientVersion}-${version} (${buildNumber})`;
        const copyright = `Copyright \xA9 ${new Date().getFullYear()} ${appName}`;
        return (
            <div className='content'>
                <img className='logo' src='assets/symphony-logo.png'/>
                <span id='app-name' className='name'>{appName}</span>
                <span id='version' className='version-text'>{versionString}</span>
                <span id='copyright' className='copyright-text'>{copyright}</span>
            </div>
        );
    }
}