import { ipcRenderer } from 'electron';
import * as React from 'react';
import { apiCmds, apiName } from '../../common/api-interface';

import { i18n } from '../../common/i18n-preload';

const NOTIFICATION_SETTINGS_NAMESPACE = 'NotificationSettings';

type startCorner = 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left';

interface IState {
    position: startCorner;
    screens: Electron.Display[];
    display: number;
}

/**
 * Notification Window component
 */
export default class NotificationSettings extends React.Component<{}, IState> {

    constructor(props) {
        super(props);
        this.state = {
            position: 'upper-right',
            screens: [],
            display: 1,
        };
        this.updateState = this.updateState.bind(this);
    }

    /**
     * Renders the notification settings window
     */
    public render(): JSX.Element {
        return (
            <div className='content'>

                <header className='header'>
                    <span className='header-title'>
                        {i18n.t('Set Notification Position', NOTIFICATION_SETTINGS_NAMESPACE)()}
                    </span>
                </header>

                <div className='form'>
                    <label className='display-label'>{i18n.t('Show on display', NOTIFICATION_SETTINGS_NAMESPACE)()}</label>
                    <div id='screens' className='display-container'>
                        <select
                            className='display-selector'
                            id='screen-selector'
                            title='position'
                            value={this.state.display}
                            onChange={this.selectDisplay.bind(this)}
                        >
                            {this.renderScreens()}
                        </select>
                    </div>

                    <label className='position-label'>{i18n.t('Position', NOTIFICATION_SETTINGS_NAMESPACE)()}</label>
                    <div className='position-container'>
                        <div className='button-set-left'>
                            {this.renderPositionButton('upper-left', 'Top Left')}
                            {this.renderPositionButton('lower-left', 'Bottom Left')}
                        </div>
                        <div className='button-set-right'>
                            {this.renderPositionButton('upper-right', 'Top Right')}
                            {this.renderPositionButton('lower-right', 'Bottom Right')}
                        </div>
                    </div>
                </div>

                <footer className='footer'>
                    <div className='footer-button-container'>
                        <button id='cancel' className='footer-button footer-button-dismiss' onClick={this.close.bind(this)}>
                            {i18n.t('CANCEL', NOTIFICATION_SETTINGS_NAMESPACE)()}
                        </button>
                        <button id='ok-button' className='footer-button footer-button-ok' onClick={this.submit.bind(this)}>
                            {i18n.t('OK', NOTIFICATION_SETTINGS_NAMESPACE)()}
                        </button>
                    </div>
                </footer>

            </div>
        );
    }

    /**
     * Handles event when the component is mounted
     */
    public componentDidMount(): void {
        ipcRenderer.on('notification-settings-data', this.updateState);
    }

    /**
     * Handles event when the component is unmounted
     */
    public componentWillUnmount(): void {
        ipcRenderer.removeListener('notification-settings-data', this.updateState);
    }

    /**
     * Updates the selected display state
     *
     * @param event
     */
    public selectDisplay(event): void {
        this.setState({ display: event.target.value });
    }

    /**
     * Updates the selected notification position
     *
     * @param event
     */
    public togglePosition(event): void {
        this.setState({
            position: event.target.id,
        });
    }

    /**
     * Submits the new settings to the main process
     */
    public submit(): void {
        const { position, display } = this.state;
        ipcRenderer.send('notification-settings-update', { position, display });
    }

    /**
     * Closes the notification settings window
     */
    public close(): void {
        ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.closeWindow,
            windowType: 'notification-settings',
        });
    }

    /**
     * Renders the position buttons
     *
     * @param id
     * @param content
     */
    private renderPositionButton(id: startCorner, content: string): JSX.Element {
        const style = this.state.position === id ? `position-button position-button-selected ${id}` : `position-button ${id}`;
        return (
            <div className='position-button-container'>
                <button
                    onClick={this.togglePosition.bind(this)}
                    className={style}
                    id={id} type='button'
                    name='position'
                    value={id}
                >
                    {i18n.t(`${content}`, NOTIFICATION_SETTINGS_NAMESPACE)()}
                </button>
            </div>
        );
    }

    /**
     * Renders the drop down list of available screens
     */
    private renderScreens(): JSX.Element[] {
        const { screens } = this.state;
        return screens.map((screen, index) => {
            const screenId = screen.id;
            return (
                <option id={String(screenId)} key={screenId} value={screenId}>{index + 1}/{screens.length}</option>
            );
        });
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
