import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

const whiteColorRegExp = new RegExp(/^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i);
const darkTheme = [ '#e23030', '#b5616a', '#ab8ead', '#ebc875', '#a3be77', '#58c6ff', '#ebab58' ];
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
    hasReply: boolean;
    // Local state
    isInputHidden: boolean;
    containerHeight: number;
}

type mouseEventButton = React.MouseEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>;
type keyboardEvent = React.KeyboardEvent<HTMLInputElement>;

// Notification container height
const CONTAINER_HEIGHT = 64;
const CONTAINER_HEIGHT_WITH_INPUT = 104;

export default class NotificationComp extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onClose: (winKey) => (_event: mouseEventButton) => this.close(winKey),
        onClick: (data) => (_event: mouseEventButton) => this.click(data),
        onContextMenu: (event) => this.contextMenu(event),
        onMouseEnter: (winKey) => (_event: mouseEventButton) => this.onMouseEnter(winKey),
        onMouseLeave: (winKey) => (_event: mouseEventButton) => this.onMouseLeave(winKey),
        onOpenReply: (winKey) => (event: mouseEventButton) => this.onOpenReply(event, winKey),
        onThumbsUp: () => (_event: mouseEventButton) => this.onThumbsUp(),
        onReply: (winKey) => (_event: mouseEventButton) => this.onReply(winKey),
        onKeyUp: (winKey) => (event: keyboardEvent) => this.onKeyUp(event, winKey),
    };
    private flashTimer: NodeJS.Timer | undefined;
    private customInput: React.RefObject<HTMLSpanElement>;
    private inputCaret: React.RefObject<HTMLDivElement>;
    private input: React.RefObject<HTMLInputElement>;

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
            isExternal: false,
            theme: '',
            isInputHidden: true,
            hasReply: false,
            containerHeight: CONTAINER_HEIGHT,
        };
        this.updateState = this.updateState.bind(this);
        this.setInputCaretPosition = this.setInputCaretPosition.bind(this);
        this.resetNotificationData = this.resetNotificationData.bind(this);

        this.customInput = React.createRef();
        this.inputCaret = React.createRef();
        this.input = React.createRef();
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
        const { title, body, id, color, isExternal, theme, isInputHidden, containerHeight, hasReply } = this.state;
        let themeClassName;
        if (theme) {
            themeClassName = theme;
        } else if (darkTheme.includes(color.toLowerCase())) {
            themeClassName = 'blackText';
        } else {
            themeClassName = color && color.match(whiteColorRegExp) ? 'light' : 'dark';
        }

        const bgColor = { backgroundColor: color || '#ffffff' };
        const containerClass = classNames('container', { 'external-border': isExternal });

        return (
            <div className={containerClass} style={{ height: containerHeight }}>
                <div
                    className='main-container'
                    role='alert'
                    style={bgColor}
                    onContextMenu={this.eventHandlers.onContextMenu}
                    onClick={this.eventHandlers.onClick(id)}
                    onMouseEnter={this.eventHandlers.onMouseEnter(id)}
                    onMouseLeave={this.eventHandlers.onMouseLeave(id)}
                >
                    <div className='logo-container'>
                        <div className='logo'>
                            <svg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                <path d='M0 20C0 12.1746 0 8.26188 1.80534 5.41094C2.72586 3.95728 3.95728 2.72586 5.41094 1.80534C8.26188 0 12.1746 0 20 0C27.8254 0 31.7381 0 34.5891 1.80534C36.0427 2.72586 37.2741 3.95728 38.1947 5.41094C40 8.26188 40 12.1746 40 20C40 27.8254 40 31.7381 38.1947 34.5891C37.2741 36.0427 36.0427 37.2741 34.5891 38.1947C31.7381 40 27.8254 40 20 40C12.1746 40 8.26188 40 5.41094 38.1947C3.95728 37.2741 2.72586 36.0427 1.80534 34.5891C0 31.7381 0 27.8254 0 20Z' fill='#000028'/>
                                <path d='M0 20C0 12.1746 0 8.26188 1.80534 5.41094C2.72586 3.95728 3.95728 2.72586 5.41094 1.80534C8.26188 0 12.1746 0 20 0C27.8254 0 31.7381 0 34.5891 1.80534C36.0427 2.72586 37.2741 3.95728 38.1947 5.41094C40 8.26188 40 12.1746 40 20C40 27.8254 40 31.7381 38.1947 34.5891C37.2741 36.0427 36.0427 37.2741 34.5891 38.1947C31.7381 40 27.8254 40 20 40C12.1746 40 8.26188 40 5.41094 38.1947C3.95728 37.2741 2.72586 36.0427 1.80534 34.5891C0 31.7381 0 27.8254 0 20Z' fill='url(#paint0_linear)'/>
                                <path d='M28 17.1029V13.4094C28 12.6528 27.56 11.9425 26.8467 11.5534C25.7833 10.9728 23.48 10 20 10C16.52 10 14.2167 10.9728 13.1533 11.5565C12.44 11.9425 12 12.6528 12 13.4094V18.9559L24.6667 22.3529V24.8235C24.6667 25.1571 24.44 25.3918 24.0533 25.5678L20 27.4485L15.9233 25.5585C15.56 25.3918 15.3333 25.1571 15.3333 24.8235V22.9706L12 22.0441V24.8235C12 26.3491 12.9433 27.6462 14.4433 28.3225L20 31L25.5333 28.3349C27.0567 27.6462 28 26.3491 28 24.8235V20.1912L15.3333 16.7941V13.9746C16.24 13.57 17.78 13.0882 20 13.0882C22.22 13.0882 23.76 13.57 24.6667 13.9746V16.1765L28 17.1029Z' fill='#0098FF'/>
                                <path
                                    d='M28 17.1029V13.4094C28 12.6528 27.56 11.9425 26.8467 11.5534C25.7833 10.9728 23.48 10 20 10C16.52 10 14.2167 10.9728 13.1533 11.5565C12.44 11.9425 12 12.6528 12 13.4094V18.9559L24.6667 22.3529V24.8235C24.6667 25.1571 24.44 25.3918 24.0533 25.5678L20 27.4485L15.9233 25.5585C15.56 25.3918 15.3333 25.1571 15.3333 24.8235V22.9706L12 22.0441V24.8235C12 26.3491 12.9433 27.6462 14.4433 28.3225L20 31L25.5333 28.3349C27.0567 27.6462 28 26.3491 28 24.8235V20.1912L15.3333 16.7941V13.9746C16.24 13.57 17.78 13.0882 20 13.0882C22.22 13.0882 23.76 13.57 24.6667 13.9746V16.1765L28 17.1029Z' fill='url(#paint1_radial)'/>
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
                    <div className='actions-container'>
                        <button
                            className={`action-button ${themeClassName}`}
                            title={i18n.t('Close')()}
                            onClick={this.eventHandlers.onClose(id)}
                        >
                            {i18n.t('Close')()}
                        </button>
                        <button
                            className={`action-button ${themeClassName}`}
                            style={{ visibility: hasReply ? 'visible' : 'hidden' }}
                            title={i18n.t('Reply')()}
                            onClick={this.eventHandlers.onOpenReply(id)}
                        >
                            {i18n.t('Reply')()}
                        </button>
                    </div>
                </div>
                <div style={{
                    ...{ display: isInputHidden ? 'none' : 'flex' },
                    ...bgColor,
                }} className='rte-container'>
                    <div className='input-container'>
                        <div className='input-border'/>
                        <div className='input-caret-container'>
                            <span ref={this.customInput} className='custom-input'/>
                        </div>
                        <div ref={this.inputCaret} className='input-caret'/>
                        <input
                            style={bgColor}
                            className={themeClassName}
                            autoFocus={true}
                            onInput={this.setInputCaretPosition}
                            onKeyDown={this.setInputCaretPosition}
                            onKeyUp={this.eventHandlers.onKeyUp(id)}
                            onChange={this.setInputCaretPosition}
                            onClick={this.setInputCaretPosition}
                            onPaste={this.setInputCaretPosition}
                            onCut={this.setInputCaretPosition}
                            onCopy={this.setInputCaretPosition}
                            onMouseDown={this.setInputCaretPosition}
                            onMouseUp={this.setInputCaretPosition}
                            onFocus={() => this.animateCaret(true)}
                            onBlur={() => this.animateCaret(false)}
                            ref={this.input}/>
                    </div>
                    <div className='rte-button-container'>
                        <button
                            className={`rte-button ${themeClassName}`}
                            onClick={this.eventHandlers.onThumbsUp()}
                        >
                            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                <path d='M7.9499 6.77495C7.9499 6.77495 6.8499 6.99995 7.7499 5.12495C8.3999 3.77495 8.3249 2.19995 7.7499 1.37495C6.7999 0.0499523 4.9749 0.474952 5.1749 1.24995C5.8249 3.87495 4.3499 4.67495 3.5999 6.32495C2.8249 7.99995 2.8999 10.4 3.2499 12.525C3.4749 13.85 4.0499 15.5 6.1249 15.5H8.9999L7.9499 6.77495Z' fill='#FFDD67'/>
                                <path d='M6.45004 15.125C4.37504 15.125 3.92504 13.475 3.70004 12.15C3.35004 10.025 3.30004 8.32495 3.97504 6.59995C4.72504 4.72495 5.50004 4.67495 5.50004 0.974951C5.50004 0.799951 5.60004 0.674951 5.70004 0.574951C5.35004 0.699951 5.15004 0.899951 5.15004 1.19995C5.15004 3.97495 4.37504 4.64995 3.62504 6.32495C2.82504 7.99995 2.90004 10.4 3.25004 12.525C3.47504 13.85 4.05004 15.5 6.12504 15.5H9.00004V15.125H6.45004Z' fill='#EBA352'/>
                                <path d='M11.5 8.9499H7.94995C6.69995 8.9499 6.69995 6.7749 7.94995 6.7749H11.5C12.75 6.7749 12.75 8.9499 11.5 8.9499Z' fill='#FFDD67'/>
                                <path d='M11.775 8.6001H8.22495C7.37495 8.6001 7.12495 7.6001 7.39995 6.9751C6.72495 7.5001 6.92495 8.9751 7.92495 8.9751H11.5C11.9 8.9751 12.175 8.7501 12.325 8.4251C12.175 8.5251 12 8.6001 11.775 8.6001Z' fill='#EBA352'/>
                                <path d='M11.875 11.1501H7.625C6.125 11.1501 6.125 8.9751 7.625 8.9751H11.9C13.375 8.9751 13.375 11.1501 11.875 11.1501Z' fill='#FFDD67'/>
                                <path d='M12.225 10.7749H7.95004C6.95004 10.7749 6.62504 9.7749 6.97504 9.1499C6.17504 9.6749 6.40004 11.1499 7.62504 11.1499H11.9C12.375 11.1499 12.7 10.9249 12.875 10.5999C12.7 10.6999 12.475 10.7749 12.225 10.7749Z' fill='#EBA352'/>
                                <path d='M11.475 13.3249H7.875C6.625 13.3249 6.625 11.1499 7.875 11.1499H11.475C12.75 11.1499 12.75 13.3249 11.475 13.3249Z' fill='#FFDD67'/>
                                <path d='M11.775 12.95H8.15003C7.30003 12.95 7.02503 11.95 7.32503 11.3C6.65003 11.825 6.82503 13.3 7.87503 13.3H11.475C11.875 13.3 12.15 13.075 12.3 12.75C12.175 12.9 11.975 12.95 11.775 12.95Z' fill='#EBA352'/>
                                <path d='M11.1 15.5H8.77495C7.42495 15.5 7.42495 13.325 8.77495 13.325H11.1C12.45 13.325 12.45 15.5 11.1 15.5Z' fill='#FFDD67'/>
                                <path d='M11.4 15.15H9.07504C8.17504 15.15 7.87504 14.15 8.20004 13.5C7.47504 14.025 7.67504 15.5 8.77504 15.5H11.1C11.55 15.5 11.825 15.275 11.975 14.95C11.825 15.075 11.625 15.15 11.4 15.15Z' fill='#EBA352'/>
                            </svg>
                        </button>
                        <button
                            className={`rte-button ${themeClassName}`}
                            onClick={this.eventHandlers.onReply(id)}
                        >
                            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                <path
                                    fillRule='evenodd'
                                    clipRule='evenodd'
                                    d='M15.952 1.30603C16.0685 0.943628 15.9692 0.546516 15.6957 0.281687C15.4223 0.016859 15.0222 -0.0697491 14.6637 0.0582825L0.663674 5.05825C0.286419 5.19299 0.0259746 5.53985 0.00182759 5.93972C-0.0223194 6.33958 0.194491 6.71527 0.552792 6.89442L6.28634 9.76122L9.63623 15.5039C9.83512 15.8448 10.2159 16.0369 10.6083 15.9941C11.0007 15.9514 11.3313 15.6818 11.452 15.306L15.952 1.30603ZM6.80256 7.78326L3.54321 6.15358L13.4278 2.62338L10.2341 12.5595L8.25222 9.16203L9.70712 7.70713C10.0976 7.31661 10.0976 6.68344 9.70712 6.29292C9.31659 5.90239 8.68343 5.90239 8.2929 6.29292L6.80256 7.78326Z'
                                    fill='#008EFF'/>
                            </svg>
                        </button>
                    </div>
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
                <svg width='26' height='17' viewBox='0 0 26 17' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <rect y='1' width='26' height='16' rx='3' fill='#F8C43F'/>
                    <path d='M8.82129 13H4.49756V5.29785H8.64941V6.38281H5.77588V8.56348H8.42383V9.64307H5.77588V11.9204H8.82129V13ZM16.0776 13H14.5469L12.9678 10.1748C12.9212 10.0889 12.8693 9.96712 12.812 9.80957H12.7905C12.7583 9.88835 12.7046 10.0101 12.6294 10.1748L11.002 13H9.46045L11.9849 9.12744L9.66455 5.29785H11.2275L12.6187 7.89746C12.7082 8.06934 12.7887 8.24121 12.8604 8.41309H12.8765C12.9803 8.1875 13.0698 8.00846 13.145 7.87598L14.5898 5.29785H16.0293L13.6553 9.1167L16.0776 13ZM22.2759 6.38281H20.063V13H18.7847V6.38281H16.5771V5.29785H22.2759V6.38281Z' fill='black'/>
                </svg>
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
        const { isInputHidden } = this.state;
        ipcRenderer.send('notification-mouseleave', id, isInputHidden);
    }

    /**
     * Insets a thumbs up emoji
     * @private
     */
    private onThumbsUp(): void {
        if (this.input.current) {
            const input = this.input.current.value;
            this.input.current.value = input + '👍';
            this.setInputCaretPosition();
            this.input.current.focus();
        }
    }

    /**
     * Handles reply action
     * @param id
     * @private
     */
    private onReply(id: number): void {
        let replyText = this.input.current?.value;
        if (replyText && replyText.trim()) {
            // need to replace 👍 with :thumbsup: to make sure client displays the correct emoji
            replyText = replyText.replace(/👍/g, replyText.length <= 2 ? ':thumbsup: ' : ':thumbsup:' );
            ipcRenderer.send('notification-on-reply', id, replyText);
        }
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
     * Displays an input on the notification
     *
     * @private
     */
    private onOpenReply(event, id) {
        event.stopPropagation();
        ipcRenderer.send('show-reply', id);
        this.setState({
            isInputHidden: false,
            hasReply: false,
            containerHeight: CONTAINER_HEIGHT_WITH_INPUT,
        }, () => {
            this.input.current?.focus();
        });
    }

    /**
     * Handles key up event and enter keyCode
     *
     * @param event
     * @param id
     * @private
     */
    private onKeyUp(event, id) {
        this.setInputCaretPosition();
        if (event.key === 'Enter' || event.keyCode === 13) {
            this.onReply(id);
        }
    }

    /**
     * Moves the custom input caret based on input text
     * @private
     */
    private setInputCaretPosition() {
        if (this.customInput.current) {
            if (this.input.current) {
                const inputText = this.input.current.value || '';
                const selectionStart = this.input.current.selectionStart || 0;
                this.customInput.current.innerText = inputText.substring(0, selectionStart).replace(/\n$/, '\n\u0001');
            }

            const rects = this.customInput.current.getClientRects();
            const lastRect = rects && rects[ rects.length - 1 ];

            const x = lastRect && lastRect.width || 0;
            if (this.inputCaret.current) {
                this.inputCaret.current.style.left = x + 'px';
            }
        }
    }

    /**
     * Adds blinking animation to input caret
     * @param hasFocus
     * @private
     */
    private animateCaret(hasFocus: boolean) {
        if (hasFocus) {
            this.inputCaret.current?.classList.add('input-caret-focus');
        } else {
            this.inputCaret.current?.classList.remove('input-caret-focus');
        }
    }

    /**
     * Sets the component state
     *
     * @param _event
     * @param data {Object}
     */
    private updateState(_event, data): void {
        const { color, flash } = data;
        data.color = (color && !color.startsWith('#')) ? '#' + color : color;
        data.isInputHidden = true;
        data.containerHeight = CONTAINER_HEIGHT;

        this.resetNotificationData();
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

    /**
     * Reset data for new notification
     * @private
     */
    private resetNotificationData(): void {
        if (this.input.current) {
            this.input.current.value = '';
        }
        this.setInputCaretPosition();
    }
}
