import { ipcRenderer, remote } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

interface IState {
    error: ERROR | string;
}

enum ERROR {
    NETWORK_OFFLINE = 'NETWORK_OFFLINE',
}

/**
 * Window that display app version and copyright info
 */
export default class LoadingScreen extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onRetry: () => this.retry(),
        onQuit: () => this.quit(),
    };

    constructor(props) {
        super(props);
        this.state = {
            error: '',
        };
        this.updateState = this.updateState.bind(this);
    }

    public componentDidMount(): void {
        ipcRenderer.on('loading-screen-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('loading-screen-data', this.updateState);
    }

    /**
     * main render function
     */
    public render(): JSX.Element {
        const { error } = this.state;
        const appName = remote.app.getName() || 'Symphony';

        if (error) {
            return this.renderErrorContent(error);
        }

        return (
            <div className='LoadingScreen'>
                <img className='LoadingScreen-logo' src={this.getImage(error)} />
                <span className='LoadingScreen-name'>{appName}</span>
                <svg width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 200' preserveAspectRatio='xMidYMid'>
                    <circle cx='50' cy='50' fill='none' ng-attr-stroke='{{config.color}}' stroke='#ffffff' strokeWidth='10' r='35' strokeDasharray='164.93361431346415 56.97787143782138' transform='rotate(59.6808 50 50)'>
                        <animateTransform attributeName='transform' type='rotate' calcMode='linear' values='0 50 50;360 50 50' keyTimes='0;1' dur='1s' begin='0s' repeatCount='indefinite' />
                    </circle>
                </svg>
            </div>
        );
    }

    /**
     * Returns the appropriate image path based on the error
     */
    private getImage(error: string): string {
        if (error) {
            return '../renderer/assets/offline_logo.png';
        }

        return '../renderer/assets/symphony-logo.png';
    }

    /**
     * Renders the error or lading icon
     */
    private renderErrorContent(error: string): JSX.Element {
        return (
            <div className='LoadingScreen'>
                <img className='LoadingScreen-logo' src={this.getImage(error)} />
                <span className='LoadingScreen-name'>{i18n.t('Problem connecting to Symphony')()}</span>
                <div id='error-code' className='LoadingScreen-error-code'>{error}</div>
                <div>
                    <button onClick={this.eventHandlers.onRetry} className='LoadingScreen-button'>{i18n.t('Try now')()}</button>
                    <button onClick={this.eventHandlers.onQuit} className='LoadingScreen-button'>{i18n.t('Quit Symphony')()}</button>
                </div>
            </div>
        );
    }

    /**
     * reloads the application
     */
    private retry(): void {
        ipcRenderer.send('reload-symphony');
    }

    /**
     * quits the application
     */
    private quit(): void {
        ipcRenderer.send('quit-symphony');
    }

    /**
     * Sets the component state
     *
     * @param _event
     * @param data {Object}
     */
    private updateState(_event, data): void {
        this.setState(data as IState);
    }
}
