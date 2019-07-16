import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

const whiteColorRegExp = new RegExp(/^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i);

interface IState {
    title: string;
    company: string;
    body: string;
    image: string;
    icon: string;
    id: number;
    color: string;
    flash: boolean;
}

type mouseEventButton = React.MouseEvent<HTMLDivElement>;

export default class NotificationComp extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onClose: (winKey) => (_event: mouseEventButton) => this.close(winKey),
        onClick: (data) => (_event: mouseEventButton) => this.click(data),
        onContextMenu: (event) => this.contextMenu(event),
        onMouseOver: (winKey) => (_event: mouseEventButton) => this.onMouseOver(winKey),
        onMouseLeave: (winKey) => (_event: mouseEventButton) => this.onMouseLeave(winKey),
    };
    private flashTimer: NodeJS.Timer | undefined;

    constructor(props) {
        super(props);
        this.state = {
            title: '',
            company: 'Symphony',
            body: '',
            image: '',
            icon: '',
            id: 0,
            color: '',
            flash: false,
        };
        this.updateState = this.updateState.bind(this);
    }

    public componentDidMount(): void {
        ipcRenderer.on('notification-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('notification-data', this.updateState);
        this.clearFlashInterval();
    }

    /**
     * Renders the custom title bar
     */
    public render(): JSX.Element {
        const { title, company, body, image, icon, id, color } = this.state;
        const isLightTheme = (color && color.match(whiteColorRegExp)) || false;

        const theme = classNames({ light: isLightTheme, dark: !isLightTheme });
        const bgColor = { backgroundColor: color || '#ffffff' };

        return (
            <div className='container'
                 role='alert'
                 style={bgColor}
                 onContextMenu={this.eventHandlers.onContextMenu}
                 onClick={this.eventHandlers.onClick(id)}
                 onMouseOver={this.eventHandlers.onMouseOver(id)}
                 onMouseLeave={this.eventHandlers.onMouseLeave(id)}
            >
                <div className='logo-container'>
                    <img className={`logo ${theme}`} alt='symphony logo'/>
                </div>
                <div className='header'>
                    <span className={`title ${theme}`}>{title}</span>
                    <span className='company' style={{color: color || '#4a4a4a'}}>{company}</span>
                    <span className={`message ${theme}`}>{body}</span>
                </div>
                <div className='user-profile-pic-container'>
                    <img src={image || icon || '../renderer/assets/symphony-default-profile-pic.png'} className='user-profile-pic' alt='user profile picture'/>
                </div>
                <div className='close' title={i18n.t('Close')()} onClick={this.eventHandlers.onClose(id)}>
                    <svg fill='#000000' height='16' viewBox='0 0 24 24' width='16' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/>
                        <path d='M0 0h24v24H0z' fill='none'/>
                    </svg>
                </div>
            </div>
        );
    }

    /**
     * Invoked when the notification window is clicked
     *
     * @param id {number}
     */
    private click(id: number): void {
        ipcRenderer.send('notification-clicked', id);
        this.clearFlashInterval();
    }

    /**
     * Closes the notification
     *
     * @param id {number}
     */
    private close(id: number): void {
        ipcRenderer.send('close-notification', id);
        this.clearFlashInterval();
    }

    /**
     * Disable context menu
     *
     * @param event
     */
    private contextMenu(event): void {
        event.preventDefault();
    }

    /**
     * Handle mouse over
     *
     * @param id {number}
     */
    private onMouseOver(id: number): void {
        ipcRenderer.send('notification-mouseover', id);
    }

    /**
     * Handle mouse over
     *
     * @param id {number}
     */
    private onMouseLeave(id: number): void {
        ipcRenderer.send('notification-mouseleave', id);
    }

    /**
     * Clears a active notification flash interval
     */
    private clearFlashInterval(): void {
        if (this.flashTimer) {
            clearInterval(this.flashTimer);
        }
    }

    /**
     * Sets the About app state
     *
     * @param _event
     * @param data {Object}
     */
    private updateState(_event, data): void {
        const { color, flash } = data;
        data.color = (color && !color.startsWith('#')) ? '#' + color : color;
        this.setState(data as IState);
        if (flash) {
            const origColor = data.color;
            this.flashTimer = setInterval(() => {
                const { color: bgColor } = this.state;
                if (bgColor === 'red') {
                    this.setState({ color: origColor });
                } else {
                    this.setState({ color: 'red' });
                }
            }, 1000);
        }
    }
}
