import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

const NOTIFICATION_SETTINGS_NAMESPACE = 'NotificationSettings';

type startCorner = 'upper-right' | 'upper-left' | 'lower-right' | 'lower-left';

interface IState {
    position: startCorner;
    screens: Electron.Display[];
    display: number;
}

/**
 * Window that display app version and copyright info
 */
export default class NotificationSettings extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onTogglePosition: (e: React.ChangeEvent<HTMLInputElement>) => this.togglePosition(e),
        onDisplaySelect: (e: React.ChangeEvent<HTMLSelectElement>) => this.selectDisplay(e),
        onSubmit: () => this.submit(),
    };

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
     * main render function
     */
    public render(): JSX.Element {
        return (
            <div className='content'>
                <header className='header'>
                    <span className='header__title'>
                        {i18n.t('Notification Settings', NOTIFICATION_SETTINGS_NAMESPACE)()}
                    </span>
                </header>
                <div className='form'>
                    <form>
                        <label className='label'>{i18n.t('Monitor', NOTIFICATION_SETTINGS_NAMESPACE)()}</label>
                        <div id='screens' className='main'>
                            <label>
                                {i18n.t('Notification shown on Monitor:  ', NOTIFICATION_SETTINGS_NAMESPACE)()}
                            </label>
                            <select className='selector' id='screen-selector' title='position' onChange={this.eventHandlers.onDisplaySelect}>
                                {this.renderScreens()}
                            </select>
                        </div>
                        <label className='label'>{i18n.t('Position', NOTIFICATION_SETTINGS_NAMESPACE)()}</label>
                        <div className='main'>
                            <div className='first-set'>
                                {this.renderRadioButtons('upper-left', 'Top Left')}
                                {this.renderRadioButtons('lower-left', 'Bottom Left')}
                            </div>
                            <div className='second-set'>
                                {this.renderRadioButtons('upper-right', 'Top Right')}
                                {this.renderRadioButtons('lower-right', 'Bottom Left')}
                            </div>
                        </div>
                    </form>
                </div>
                <footer className='footer'>
                    <div className='buttonLayout'>
                        <button id='cancel' className='buttonDismiss'>
                            {i18n.t('CANCEL', NOTIFICATION_SETTINGS_NAMESPACE)()}
                        </button>
                        <button id='ok-button' className='button' onClick={this.eventHandlers.onSubmit}>
                            {i18n.t('OK', NOTIFICATION_SETTINGS_NAMESPACE)()}
                        </button>
                    </div>
                </footer>
            </div>
        );
    }

    public componentDidMount(): void {
        ipcRenderer.on('notification-settings-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('notification-settings-data', this.updateState);
    }

    /**
     * Renders all 4 different notification position options
     *
     * @param id
     * @param content
     */
    private renderRadioButtons(id: startCorner, content: string): JSX.Element {
        return (
            <div className='radio'>
                <label className='radio__label'>
                    <span>
                        {i18n.t(`${content}`, NOTIFICATION_SETTINGS_NAMESPACE)()}
                    </span>
                    <input onChange={this.eventHandlers.onTogglePosition} className={id} id={id} type='radio' name='position' value={id}/>
                </label>
            </div>
        );
    }

    /**
     * Renders the drop down list of available screen
     */
    private renderScreens(): JSX.Element[] {
        const { screens } = this.state;
        return screens.map((screen, index) => {
            return (
                <option id={String(screen.id)} value={screen.id}>{index + 1}</option>
            );
        });
    }

    /**
     * Updates the selected display state
     *
     * @param event
     */
    private selectDisplay(event): void {
        this.setState({ display: event.target.value });
    }

    /**
     * Updated the selected notification position
     *
     * @param event
     */
    private togglePosition(event): void {
        this.setState({
            position: event.currentTarget.value,
        });
    }

    /**
     * Sends the user selected notification settings options
     */
    private submit(): void {
        const { position, display } = this.state;
        ipcRenderer.send('notification-settings-update', { position, display });
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
