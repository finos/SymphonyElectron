import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

interface IState {
    title: string;
    company: string;
    body: string;
    image: string;
    windowId: number;
}

type mouseEventButton = React.MouseEvent<HTMLDivElement>;

export default class NotificationComp extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onClose: (winKey) => (_event: mouseEventButton) => this.close(winKey),
    };

    constructor(props) {
        super(props);
        this.state = {
            title: '',
            company: 'Symphony',
            body: '',
            image: '',
            windowId: 0,
        };
        this.updateState = this.updateState.bind(this);
    }

    public componentDidMount(): void {
        ipcRenderer.on('notification-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('notification-data', this.updateState);
    }

    /**
     * Renders the custom title bar
     */
    public render(): JSX.Element {
        const { title, company, body, image, windowId } = this.state;
        return (
            <div className='container'>
                <div className='logo-container'>
                    <img src='../renderer/assets/symphony-logo-white.png' className='logo' alt='symphony logo'/>
                </div>
                <div className='header'>
                    <span className='title'>{title}</span>
                    <span className='company'>{company}</span>
                    <span className='message'>{body}</span>
                </div>
                <div className='user-profile-pic-container'>
                    <img src={image} className='user-profile-pic' alt='user profile picture'/>
                </div>
                <div className='close' title={i18n.t('Close')()} onClick={this.eventHandlers.onClose(windowId)}>
                    <svg fill='#000000' height='16' viewBox='0 0 24 24' width='16' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/>
                        <path d='M0 0h24v24H0z' fill='none'/>
                    </svg>
                </div>
            </div>
        );
    }

    /**
     * Closes the notification
     *
     * @param windowId
     */
    private close(windowId: number) {
        ipcRenderer.send('close-notification', windowId);
    }

    /**
     * Sets the About app state
     *
     * @param _event
     * @param data {Object}
     */
    private updateState(_event, data): void {
        this.setState(data as IState);
    }
}