import { ipcRenderer, remote } from 'electron';
import * as React from 'react';

import { apiCmds, apiName } from '../../common/api-interface';
import { i18n } from '../../common/i18n-preload';

interface IState {
    isMaximized: boolean;
    isFullScreen: boolean;
    titleBarHeight: string;
}

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

    public componentDidMount() {
        const contentWrapper = document.getElementById('content-wrapper');
        if (contentWrapper) {
            if (this.state.isFullScreen) {
                contentWrapper.style.marginTop = '0px';
                document.body.style.removeProperty('margin-top');
            } else {
                contentWrapper.style.marginTop = this.state.titleBarHeight;
            }
        } else {
            document.body.style.marginTop = this.state.titleBarHeight;
        }
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
            <div className='title-bar'
                onDoubleClick={this.state.isMaximized ? this.eventHandlers.onUnmaximize : this.eventHandlers.onMaximize}
                style={style}
            >
                <div className='title-bar-button-container'>
                    <button
                        title={i18n.t('Menu')()}
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
                    <img className='symphony-logo'/>
                    <p className='title-bar-title'>{document.title || 'Symphony'}</p>
                </div>
                <div className='title-bar-button-container'>
                    <button
                        className='title-bar-button'
                        title={i18n.t('Minimize')()}
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
                        title={i18n.t('Close')()}
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
                    title={i18n.t('Maximize')()}
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
        } else {
            return (
                <button
                    className='title-bar-button'
                    title={i18n.t('unMaximize')()}
                    onClick={this.eventHandlers.onMaximize  }
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
     * Updates the state with the give value
     * @param state
     */
    private updateState(state: Partial<IState>) {
        this.setState((s) => Object.assign(s, state));
    }
}
