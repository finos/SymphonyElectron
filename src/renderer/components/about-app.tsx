import { ipcRenderer, remote } from 'electron';
import * as React from 'react';

interface IState {
    appName: string;
    copyWrite?: string;
    clientVersion: string;
    buildNumber: string;
}

/**
 * Window that display app version and copyright info
 */
export default class AboutApp extends React.Component<{}, IState> {

    constructor(props) {
        super(props);
        this.state = {
            appName: 'Symphony',
            buildNumber: '',
            clientVersion: '0',
        };
        this.updateState = this.updateState.bind(this);
    }

    /**
     * main render function
     */
    public render(): JSX.Element {
        const { clientVersion, buildNumber } = this.state;
        const appName = remote.app.getName() || 'Symphony';
        const versionString = `Version ${clientVersion} (${buildNumber})`;
        const copyright = `Copyright \xA9 ${new Date().getFullYear()} ${appName}`;
        return (
            <div className='AboutApp'>
                <img className='AboutApp-logo' src='../renderer/assets/symphony-logo.png'/>
                <span className='AboutApp-name'>{appName}</span>
                <span className='AboutApp-versionText'>{versionString}</span>
                <span className='AboutApp-copyrightText'>{copyright}</span>
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
     * Sets the About app state
     *
     * @param _event
     * @param data {Object} { buildNumber, clientVersion, version }
     */
    private updateState(_event, data): void {
        this.setState(data as IState);
    }
}
