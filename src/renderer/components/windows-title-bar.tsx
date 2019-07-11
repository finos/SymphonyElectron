import { ipcRenderer, remote } from 'electron';
import * as React from 'react';

import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';

interface IState {
    isMaximized: boolean;
    isFullScreen: boolean;
    titleBarHeight: string;
}
const TITLE_BAR_NAMESPACE = 'TitleBar';

export default class WindowsTitleBar extends React.Component<{}, IState> {
    private readonly window: Electron.BrowserWindow;
    private readonly eventHandlers = {
        onClose: () => this.close(),
        onMaximize: () => this.maximize(),
        onMinimize: () => this.minimize(),
        onShowMenu: () => this.showMenu(),
        onUnmaximize: () => this.unmaximize(),
    };

    constructor(props) {
        super(props);
        this.window = remote.getCurrentWindow();
        this.state = {
            isFullScreen: this.window.isFullScreen(),
            isMaximized: this.window.isMaximized(),
            titleBarHeight: '32px',
        };
        // Adds borders to the window
        this.addWindowBorders();

        this.renderMaximizeButtons = this.renderMaximizeButtons.bind(this);
        // Event to capture and update icons
        this.window.on('maximize', () => this.updateState({ isMaximized: true }));
        this.window.on('unmaximize', () => this.updateState({ isMaximized: false }));
        this.window.on('enter-full-screen', () =>  this.updateState({ isFullScreen: true }));
        this.window.on('leave-full-screen', () => this.updateState({ isFullScreen: false }));
    }

    public componentDidMount(): void {
        const contentWrapper = document.getElementById('content-wrapper');
        if (!contentWrapper) {
            document.body.style.marginTop = this.state.titleBarHeight;
            return;
        }
        if (this.state.isFullScreen) {
            contentWrapper.style.marginTop = '0px';
            document.body.style.removeProperty('margin-top');
            return;
        }
        contentWrapper.style.marginTop = this.state.titleBarHeight;
    }

    public componentWillMount() {
        this.window.removeListener('maximize', this.updateState);
        this.window.removeListener('unmaximize', this.updateState);
        this.window.removeListener('enter-full-screen', this.updateState);
        this.window.removeListener('leave-full-screen', this.updateState);
    }

    /**
     * Renders the custom title bar
     */
    public render(): JSX.Element | null {

        const { isFullScreen } = this.state;
        const style = { display: isFullScreen ? 'none' : 'flex' };

        return (
            <div id='title-bar'
                onDoubleClick={this.state.isMaximized ? this.eventHandlers.onUnmaximize : this.eventHandlers.onMaximize}
                style={style}
            >
                <div className='title-bar-button-container'>
                    <button
                        title={i18n.t('Menu', TITLE_BAR_NAMESPACE)()}
                        className='hamburger-menu-button'
                        onClick={this.eventHandlers.onShowMenu}
                        onMouseDown={this.handleMouseDown}
                    >
                        <svg x='0px' y='0px' viewBox='0 0 15 10'>
                            <rect fill='rgba(255, 255, 255, 0.9)' width='15' height='1'/>
                            <rect fill='rgba(255, 255, 255, 0.9)' y='4' width='15' height='1'/>
                            <rect fill='rgba(255, 255, 255, 0.9)' y='8' width='152' height='1'/>
                        </svg>
                    </button>
                </div>
                <div className='title-container'>
                    {this.getSymphonyLogo()}
                    <p id='title-bar-title'>{document.title || 'Symphony'}</p>
                </div>
                <div className='title-bar-button-container'>
                    <button
                        className='title-bar-button'
                        title={i18n.t('Minimize', TITLE_BAR_NAMESPACE)()}
                        onClick={this.eventHandlers.onMinimize}
                        onMouseDown={this.handleMouseDown}
                    >
                        <svg x='0px' y='0px' viewBox='0 0 14 1'>
                            <rect fill='rgba(255, 255, 255, 0.9)' width='14' height='0.6'/>
                        </svg>
                    </button>
                </div>
                <div className='title-bar-button-container'>
                    {this.renderMaximizeButtons()}
                </div>
                <div className='title-bar-button-container'>
                    <button
                        className='title-bar-button'
                        title={i18n.t('Close', TITLE_BAR_NAMESPACE)()}
                        onClick={this.eventHandlers.onClose}
                        onMouseDown={this.handleMouseDown}
                    >
                        <svg x='0px' y='0px' viewBox='0 0 14 10.2'>
                            <polygon
                                fill='rgba(255, 255, 255, 0.9)'
                                points='10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1 '
                            />
                        </svg>
                    </button>
                </div>
                <div className='branding-logo' />
            </div>
        );
    }

    /**
     * Renders maximize or minimize buttons based on fullscreen state
     */
    public renderMaximizeButtons(): JSX.Element {
        const { isMaximized } = this.state;

        if (isMaximized) {
            return (
                <button
                    className='title-bar-button'
                    title={i18n.t('Restore', TITLE_BAR_NAMESPACE)()}
                    onClick={this.eventHandlers.onUnmaximize}
                    onMouseDown={this.handleMouseDown}
                >
                    <svg x='0px' y='0px' viewBox='0 0 14 10.2'>
                        <path
                            fill='rgba(255, 255, 255, 0.9)'
                            d='M2.1,0v2H0v8.1h8.2v-2h2V0H2.1z M7.2,9.2H1.1V3h6.1V9.2z M9.2,7.1h-1V2H3.1V1h6.1V7.1z'
                        />
                    </svg>
                </button>
            );
        }
        return (
            <button
                className='title-bar-button'
                title={i18n.t('Maximize', TITLE_BAR_NAMESPACE)()}
                onClick={this.eventHandlers.onMaximize}
                onMouseDown={this.handleMouseDown}
            >
                <svg x='0px' y='0px' viewBox='0 0 14 10.2'>
                    <path
                        fill='rgba(255, 255, 255, 0.9)'
                        d='M0,0v10.1h10.2V0H0z M9.2,9.2H1.1V1h8.1V9.2z'
                    />
                </svg>
            </button>
        );
    }

    /**
     * Method that closes the browser window
     */
    public close(): void {
        if (this.isValidWindow()) {
            this.window.close();
        }
    }

    /**
     * Method that minimizes the browser window
     */
    public minimize(): void {
        if (this.isValidWindow()) {
            this.window.minimize();
        }
    }

    /**
     * Method that maximize the browser window
     */
    public maximize(): void {
        if (this.isValidWindow()) {
            this.window.maximize();
            this.setState({ isMaximized: true });
        }
    }

    /**
     * Method that unmaximize the browser window
     */
    public unmaximize(): void {
        if (this.isValidWindow()) {
            this.window.isFullScreen() ? this.window.setFullScreen(false) : this.window.unmaximize();
        }
    }

    /**
     * Method that popup the application menu
     */
    public showMenu(): void {
        if (this.isValidWindow()) {
            ipcRenderer.send(apiName.symphonyApi, {
                cmd: apiCmds.popupMenu,
            });
        }
    }

    /**
     * verifies if the this.window is valid and is not destroyed
     */
    public isValidWindow(): boolean {
        return (this.window && !this.window.isDestroyed());
    }

    /**
     * Prevent default to make sure buttons don't take focus
     * @param e
     */
    private handleMouseDown(e) {
        e.preventDefault();
    }

    /**
     * Adds borders to the edges of the window chrome
     */
    private addWindowBorders() {
        const borderBottom = document.createElement('div');
        borderBottom.className = 'bottom-window-border';

        document.body.appendChild(borderBottom);
        document.body.classList.add('window-border');
    }

    /**
     * Returns the title bar logo
     */
    private getSymphonyLogo(): JSX.Element {
        return (
            <svg width={20} viewBox='0 0 19.7 32'>
                <title>{'Symphony_logo'}</title>
                <linearGradient
                    id='prefix__a'
                    gradientUnits='userSpaceOnUse'
                    x1={39.819}
                    y1={23.981}
                    x2={39.246}
                    y2={23.726}
                    gradientTransform='matrix(7.6157 0 0 -3.458 -295.325 101.04)'
                >
                    <stop offset={0} stopColor='#197a68' />
                    <stop offset={1} stopColor='#329d87' />
                </linearGradient>
                <path d='M2.4 17.4c0 1.2.3 2.4.8 3.5l6.8-3.5H2.4z' fill='url(#prefix__a)' />
                <linearGradient
                    id='prefix__b'
                    gradientUnits='userSpaceOnUse'
                    x1={28.916}
                    y1={22.811}
                    x2={29.916}
                    y2={22.811}
                    gradientTransform='matrix(2.7978 0 0 -4.7596 -73.704 128.374)'
                >
                    <stop offset={0} stopColor='#1d7e7b' />
                    <stop offset={1} stopColor='#35b0b7' />
                </linearGradient>
                <path
                    d='M7.2 21.3c.8.6 1.8.9 2.8.9v-4.8l-2.8 3.9z'
                    fill='url(#prefix__b)'
                />
                <linearGradient
                    id='prefix__c'
                    gradientUnits='userSpaceOnUse'
                    x1={37.958}
                    y1={21.136}
                    x2={38.178}
                    y2={21.868}
                    gradientTransform='matrix(6.1591 0 0 -11.4226 -223.952 256.877)'
                >
                    <stop offset={0} stopColor='#175952' />
                    <stop offset={1} stopColor='#3a8f88' />
                </linearGradient>
                <path
                    d='M14.4 6.9C13 6.3 11.5 6 10 6c-.6 0-1.2 0-1.8.1L10 17.4l4.4-10.5z'
                    fill='url(#prefix__c)'
                />
                <linearGradient
                    id='prefix__d'
                    gradientUnits='userSpaceOnUse'
                    x1={40.569}
                    y1={22.098}
                    x2={41.029}
                    y2={22.377}
                    gradientTransform='matrix(9.5186 0 0 -5.5951 -373.339 140.324)'
                >
                    <stop offset={0} stopColor='#39a8ba' />
                    <stop offset={1} stopColor='#3992b4' />
                </linearGradient>
                <path d='M10 17.4h9.5c0-2-.6-4-1.8-5.6L10 17.4z' fill='url(#prefix__d)' />
                <linearGradient
                    id='prefix__e'
                    gradientUnits='userSpaceOnUse'
                    x1={41.214}
                    y1={22.325}
                    x2={40.706}
                    y2={22.548}
                    gradientTransform='matrix(9.9955 0 0 -5.2227 -404.796 132.876)'
                >
                    <stop offset={0} stopColor='#021c3c' />
                    <stop offset={1} stopColor='#215180' />
                </linearGradient>
                <path
                    d='M1.5 12.2C.5 13.8 0 15.6 0 17.4h10l-8.5-5.2z'
                    fill='url(#prefix__e)'
                />
                <linearGradient
                    id='prefix__f'
                    gradientUnits='userSpaceOnUse'
                    x1={33.511}
                    y1={22.151}
                    x2={34.511}
                    y2={22.151}
                    gradientTransform='matrix(3.9169 0 0 -6.6631 -125.178 161.684)'
                >
                    <stop offset={0} stopColor='#23796c' />
                    <stop offset={1} stopColor='#41beaf' />
                </linearGradient>
                <path
                    d='M10 10.8c-1.4 0-2.8.4-3.9 1.3l3.9 5.4v-6.7z'
                    fill='url(#prefix__f)'
                />
                <linearGradient
                    id='prefix__g'
                    gradientUnits='userSpaceOnUse'
                    x1={36.129}
                    y1={21.958}
                    x2={36.487}
                    y2={21.481}
                    gradientTransform='matrix(5.0353 0 0 -8.5671 -171.59 208.333)'
                >
                    <stop offset={0} stopColor='#14466a' />
                    <stop offset={1} stopColor='#286395' />
                </linearGradient>
                <path d='M10 26c1.8 0 3.6-.6 5-1.6l-5-6.9V26z' fill='url(#prefix__g)' />
                <linearGradient
                    id='prefix__h'
                    gradientUnits='userSpaceOnUse'
                    x1={38.534}
                    y1={23.656}
                    x2={39.087}
                    y2={23.578}
                    gradientTransform='matrix(6.663 0 0 -3.5931 -244.84 102.835)'
                >
                    <stop offset={0} stopColor='#261d49' />
                    <stop offset={1} stopColor='#483a6d' />
                </linearGradient>
                <path
                    d='M16.6 16.4l-6.6 1 6.2 2.6c.3-.8.5-1.7.5-2.6 0-.3-.1-.7-.1-1z'
                    fill='url(#prefix__h)'
                />
            </svg>
        );
    }

    /**
     * Updates the state with the give value
     * @param state
     */
    private updateState(state: Partial<IState>) {
        this.setState((s) => Object.assign(s, state));
    }
}
