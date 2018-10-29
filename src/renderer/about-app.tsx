import { ipcRenderer, remote } from 'electron';
import * as React from 'react';

interface IState {
    appName: string | undefined;
    copyWrite: string | undefined;
    clientVersion: string | undefined;
    buildNumber: string | undefined;
    version: string | undefined;
}

/**
 * Window that display app version and copyright info
 */
export default class AboutBox extends React.Component<{}, IState> {

    constructor(props) {
        super(props);
        this.state = {
            appName: remote.app.getName() || 'Symphony',
            buildNumber: '',
            clientVersion: '',
            copyWrite: `Copyright \xA9 ${new Date().getFullYear()} Symphony`,
            version: '',
        };
    }

    /**
     * comp
     */
    public componentWillMount() {
        ipcRenderer.on('data', (_EVENT: Electron.Event, args: IState) => {
            this.setState({
                copyWrite: `Copyright \xA9 ${new Date().getFullYear()} ${this.state.appName}`,
                version: `Version ${args.clientVersion}-${args.version} (${args.buildNumber})`,
            });
        });
    }

    /**
     * main render function
     */
    public render() {
        return (
            <div className='content'>
                <img className='logo' src='symphony-logo.png'/>
                <span id='app-name' className='name'>{this.state.appName}</span>
                <span id='version' className='version-text'>{this.state.version}</span>
                <span id='copyright' className='copyright-text'>{this.state.copyWrite}</span>
            </div>
        );
    }
}