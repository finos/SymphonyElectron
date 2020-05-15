import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

const whiteColorRegExp = new RegExp(/^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i);
const darkTheme = [ '#b5616a', '#ab8ead', '#ebc875', '#a3be77', '#58c6ff', '#ebab58' ];
type Theme = '' | 'light' | 'dark';

interface IState {
    title: string;
    company: string;
    body: string;
    image: string;
    icon: string;
    id: number;
    color: string;
    flash: boolean;
    isExternal: boolean;
    theme: Theme;
}

type mouseEventButton = React.MouseEvent<HTMLDivElement>;

export default class NotificationComp extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onClose: (winKey) => (_event: mouseEventButton) => this.close(winKey),
        onClick: (data) => (_event: mouseEventButton) => this.click(data),
        onContextMenu: (event) => this.contextMenu(event),
        onMouseEnter: (winKey) => (_event: mouseEventButton) => this.onMouseEnter(winKey),
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
            isExternal: true,
            theme: '',
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
        const { title, body, image, icon, id, color, isExternal, theme } = this.state;
        let themeClassName;
        if (theme) {
            themeClassName = theme;
        } else if (darkTheme.includes(color.toLowerCase())) {
            themeClassName = 'light';
        } else {
            themeClassName = color && color.match(whiteColorRegExp) ? 'light' : 'dark';
        }

        const bgColor = { backgroundColor: color || '#ffffff' };

        return (
            <div className='container'
                 role='alert'
                 style={bgColor}
                 onContextMenu={this.eventHandlers.onContextMenu}
                 onClick={this.eventHandlers.onClick(id)}
                 onMouseEnter={this.eventHandlers.onMouseEnter(id)}
                 onMouseLeave={this.eventHandlers.onMouseLeave(id)}
            >
                {isExternal ? <div className='ext-border'/> : null}
                <div className='logo-container'>
                    <div className='logo'>
                        <svg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'>
                            <path d='M0 20C0 12.1746 0 8.26188 1.80534 5.41094C2.72586 3.95728 3.95728 2.72586 5.41094 1.80534C8.26188 0 12.1746 0 20 0C27.8254 0 31.7381 0 34.5891 1.80534C36.0427 2.72586 37.2741 3.95728 38.1947 5.41094C40 8.26188 40 12.1746 40 20C40 27.8254 40 31.7381 38.1947 34.5891C37.2741 36.0427 36.0427 37.2741 34.5891 38.1947C31.7381 40 27.8254 40 20 40C12.1746 40 8.26188 40 5.41094 38.1947C3.95728 37.2741 2.72586 36.0427 1.80534 34.5891C0 31.7381 0 27.8254 0 20Z' fill='#000028'/>
                            <path d='M0 20C0 12.1746 0 8.26188 1.80534 5.41094C2.72586 3.95728 3.95728 2.72586 5.41094 1.80534C8.26188 0 12.1746 0 20 0C27.8254 0 31.7381 0 34.5891 1.80534C36.0427 2.72586 37.2741 3.95728 38.1947 5.41094C40 8.26188 40 12.1746 40 20C40 27.8254 40 31.7381 38.1947 34.5891C37.2741 36.0427 36.0427 37.2741 34.5891 38.1947C31.7381 40 27.8254 40 20 40C12.1746 40 8.26188 40 5.41094 38.1947C3.95728 37.2741 2.72586 36.0427 1.80534 34.5891C0 31.7381 0 27.8254 0 20Z' fill='url(#paint0_linear)'/>
                            <path d='M28 17.1029V13.4094C28 12.6528 27.56 11.9425 26.8467 11.5534C25.7833 10.9728 23.48 10 20 10C16.52 10 14.2167 10.9728 13.1533 11.5565C12.44 11.9425 12 12.6528 12 13.4094V18.9559L24.6667 22.3529V24.8235C24.6667 25.1571 24.44 25.3918 24.0533 25.5678L20 27.4485L15.9233 25.5585C15.56 25.3918 15.3333 25.1571 15.3333 24.8235V22.9706L12 22.0441V24.8235C12 26.3491 12.9433 27.6462 14.4433 28.3225L20 31L25.5333 28.3349C27.0567 27.6462 28 26.3491 28 24.8235V20.1912L15.3333 16.7941V13.9746C16.24 13.57 17.78 13.0882 20 13.0882C22.22 13.0882 23.76 13.57 24.6667 13.9746V16.1765L28 17.1029Z' fill='#0098FF'/>
                            <path d='M28 17.1029V13.4094C28 12.6528 27.56 11.9425 26.8467 11.5534C25.7833 10.9728 23.48 10 20 10C16.52 10 14.2167 10.9728 13.1533 11.5565C12.44 11.9425 12 12.6528 12 13.4094V18.9559L24.6667 22.3529V24.8235C24.6667 25.1571 24.44 25.3918 24.0533 25.5678L20 27.4485L15.9233 25.5585C15.56 25.3918 15.3333 25.1571 15.3333 24.8235V22.9706L12 22.0441V24.8235C12 26.3491 12.9433 27.6462 14.4433 28.3225L20 31L25.5333 28.3349C27.0567 27.6462 28 26.3491 28 24.8235V20.1912L15.3333 16.7941V13.9746C16.24 13.57 17.78 13.0882 20 13.0882C22.22 13.0882 23.76 13.57 24.6667 13.9746V16.1765L28 17.1029Z' fill='url(#paint1_radial)'/>
                            <defs>
                                <linearGradient id='paint0_linear' x1='20' y1='0' x2='20' y2='40' gradientUnits='userSpaceOnUse'>
                                    <stop stopColor='white' stopOpacity='0.2'/>
                                    <stop offset='1' stopColor='white' stopOpacity='0'/>
                                </linearGradient>
                                <radialGradient id='paint1_radial' cx='0' cy='0' r='1' gradientUnits='userSpaceOnUse' gradientTransform='translate(20.0278 10) rotate(90) scale(14.2187 20.1481)'>
                                    <stop stopColor='white' stopOpacity='0.4'/>
                                    <stop offset='1' stopColor='white' stopOpacity='0'/>
                                </radialGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
                <div className='header'>
                    <div className='title-container'>
                        <span className={`title ${themeClassName}`}>{title}</span>
                        {this.renderExtBadge(isExternal)}
                    </div>
                    <span className={`message ${themeClassName}`}>{body}</span>
                </div>
                {this.renderProfile(icon, image, title)}
                <div className='close' title={i18n.t('Close')()} onClick={this.eventHandlers.onClose(id)}>
                    <svg width='8' height='8' viewBox='0 0 8 8' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M1.35355 0.646447C1.15829 0.451184 0.841709 0.451184 0.646447 0.646447C0.451184 0.841709 0.451184 1.15829 0.646447 1.35355L3.29289 4L0.646447 6.64645C0.451185 6.84171 0.451185 7.15829 0.646447 7.35356C0.841709 7.54882 1.15829 7.54882 1.35355 7.35356L4 4.70711L6.64645 7.35355C6.84171 7.54882 7.15829 7.54882 7.35355 7.35355C7.54882 7.15829 7.54882 6.84171 7.35355 6.64645L4.70711 4L7.35355 1.35356C7.54882 1.15829 7.54882 0.84171 7.35355 0.646448C7.15829 0.451186 6.84171 0.451186 6.64645 0.646448L4 3.29289L1.35355 0.646447Z' fill='#525760'/>
                        <path d='M1.35355 0.646447C1.15829 0.451184 0.841709 0.451184 0.646447 0.646447C0.451184 0.841709 0.451184 1.15829 0.646447 1.35355L3.29289 4L0.646447 6.64645C0.451185 6.84171 0.451185 7.15829 0.646447 7.35356C0.841709 7.54882 1.15829 7.54882 1.35355 7.35356L4 4.70711L6.64645 7.35355C6.84171 7.54882 7.15829 7.54882 7.35355 7.35355C7.54882 7.15829 7.54882 6.84171 7.35355 6.64645L4.70711 4L7.35355 1.35356C7.54882 1.15829 7.54882 0.84171 7.35355 0.646448C7.15829 0.451186 6.84171 0.451186 6.64645 0.646448L4 3.29289L1.35355 0.646447Z' fill='white' fill-opacity='0.96'/>
                    </svg>
                </div>
            </div>
        );
    }

    /**
     * Renders external badge if the content is from external
     * @param isExternal
     */
    private renderExtBadge(isExternal: boolean): JSX.Element | undefined {
        if (!isExternal) {
            return;
        }
        return (
            <div className='ext-badge-container'>
                <svg width='32' height='16' viewBox='0 0 32 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <rect width='32' height='16' rx='8' fill='#F6B202'/>
                    <rect width='32' height='16' rx='8' fill='white' fill-opacity='0.24'/>
                    <path d='M11.4414 13H6.72461V4.59766H11.2539V5.78125H8.11914V8.16016H11.0078V9.33789H8.11914V11.8223H11.4414V13ZM19.3574 13H17.6875L15.9648 9.91797C15.9141 9.82422 15.8574 9.69141 15.7949 9.51953H15.7715C15.7363 9.60547 15.6777 9.73828 15.5957 9.91797L13.8203 13H12.1387L14.8926 8.77539L12.3613 4.59766H14.0664L15.584 7.43359C15.6816 7.62109 15.7695 7.80859 15.8477 7.99609H15.8652C15.9785 7.75 16.0762 7.55469 16.1582 7.41016L17.7344 4.59766H19.3047L16.7148 8.76367L19.3574 13ZM26.1191 5.78125H23.7051V13H22.3105V5.78125H19.9023V4.59766H26.1191V5.78125Z' fill='#525760'/>
                    <path d='M11.4414 13H6.72461V4.59766H11.2539V5.78125H8.11914V8.16016H11.0078V9.33789H8.11914V11.8223H11.4414V13ZM19.3574 13H17.6875L15.9648 9.91797C15.9141 9.82422 15.8574 9.69141 15.7949 9.51953H15.7715C15.7363 9.60547 15.6777 9.73828 15.5957 9.91797L13.8203 13H12.1387L14.8926 8.77539L12.3613 4.59766H14.0664L15.584 7.43359C15.6816 7.62109 15.7695 7.80859 15.8477 7.99609H15.8652C15.9785 7.75 16.0762 7.55469 16.1582 7.41016L17.7344 4.59766H19.3047L16.7148 8.76367L19.3574 13ZM26.1191 5.78125H23.7051V13H22.3105V5.78125H19.9023V4.59766H26.1191V5.78125Z' fill='black' fill-opacity='0.24'/>
                </svg>
            </div>
        );
    }

    /**
     * Renders user profile image if present else use
     * the first char of the notification title
     *
     * @param icon
     * @param image
     * @param title
     */
    private renderProfile(icon: string, image: string, title: string): JSX.Element {
        if (icon || image) {
            return (
                <div className='user-profile-pic-container'>
                    <img src={image || icon || '../renderer/assets/symphony-default-profile-pic.png'} className='user-profile-pic' alt='user profile picture'/>
                </div>
            );
        }
        return (
            <div className='user-name-text-container'>
                <span className='user-name-text'>{title.substr(0, 1)}</span>
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
     * Handle mouse enter
     *
     * @param id {number}
     */
    private onMouseEnter(id: number): void {
        ipcRenderer.send('notification-mouseenter', id);
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
        if (this.flashTimer) {
            clearInterval(this.flashTimer);
        }
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
