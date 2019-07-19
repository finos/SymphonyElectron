import { ipcRenderer } from 'electron';
import Timer = NodeJS.Timer;

import { i18n } from '../../common/i18n-preload';

const SNACKBAR_NAMESPACE = 'SnackBar';

export default class SnackBar {
    private snackBarTimer: Timer | undefined;
    private domParser: DOMParser;

    private readonly body: HTMLCollectionOf<Element>;
    private readonly snackBar: HTMLElement | null;

    constructor() {
        this.body = document.getElementsByTagName('body');

        this.domParser = new DOMParser();
        const snackBar = this.domParser.parseFromString(this.render(), 'text/html');
        this.snackBar = snackBar.getElementById('snack-bar');
    }

    /**
     * initializes the event listeners
     */
    public initSnackBar(): void {
        this.showSnackBar = this.showSnackBar.bind(this);
        this.removeSnackBar = this.removeSnackBar.bind(this);

        ipcRenderer.on('window-enter-full-screen', this.showSnackBar);
        ipcRenderer.on('window-leave-full-screen', this.removeSnackBar);
    }

    /**
     * Displays snackbar for 3sec
     */
    public showSnackBar(): void {
        setTimeout(() => {
            if (this.body && this.body.length > 0 && this.snackBar) {
                this.body[ 0 ].appendChild(this.snackBar);
                this.snackBar.classList.add('SnackBar-show');
                this.snackBarTimer = setTimeout(() => {
                    if (this.snackBar) {
                        if (document.getElementById('snack-bar')) {
                            this.body[ 0 ].removeChild(this.snackBar);
                        }
                    }
                }, 3000);
            }
        }, 100);
    }

    /**
     * Removes snackbar
     */
    public removeSnackBar(): void {
        if (this.body && this.body.length > 0 && this.snackBar) {
            if (document.getElementById('snack-bar')) {
                this.body[ 0 ].removeChild(this.snackBar);
                if (this.snackBarTimer) {
                    clearTimeout(this.snackBarTimer);
                }
            }
        }
    }

    /**
     * Renders the custom title bar
     */
    public render(): string {
        return (
            `<div id='snack-bar' class='SnackBar'>
                <span >${i18n.t('Press ', SNACKBAR_NAMESPACE)()}</span>
                <span class='SnackBar-esc'>${i18n.t('esc', SNACKBAR_NAMESPACE)()}</span>
                <span >${i18n.t(' to exit full screen', SNACKBAR_NAMESPACE)()}</span>
            </div>`
        );
    }
}
