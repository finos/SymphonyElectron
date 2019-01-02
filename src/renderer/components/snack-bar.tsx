import { ipcRenderer } from 'electron';
import * as React from 'react';

import Timer = NodeJS.Timer;
import { i18n } from '../../common/i18n-preload';

interface IState {
    show: boolean;
}

const SNACKBAR_NAMESPACE = 'SnackBar';

export default class SnackBar extends React.Component<{}, IState> {
    private snackBarTimer: Timer | undefined;

    constructor(props) {
        super(props);
        this.state = {
            show: false,
        };
        this.showSnackBar = this.showSnackBar.bind(this);
        this.removeSnackBar = this.removeSnackBar.bind(this);
    }

    public componentDidMount(): void {
        ipcRenderer.on('window-enter-full-screen', this.showSnackBar);
        ipcRenderer.on('window-leave-full-screen', this.removeSnackBar);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('window-enter-full-screen', this.showSnackBar);
        ipcRenderer.removeListener('window-leave-full-screen', this.removeSnackBar);
    }

    /**
     * Displays snackbar for 3sec
     */
    public showSnackBar(): void {
        this.setState({ show: true });
        this.snackBarTimer = setTimeout(() => {
            this.removeSnackBar();
        }, 3000);
    }

    /**
     * Removes snackbar
     */
    public removeSnackBar(): void {
        this.setState({ show: false });
        if (this.snackBarTimer) {
            clearTimeout(this.snackBarTimer);
        }
    }

    /**
     * Renders the custom title bar
     */
    public render(): JSX.Element | null {
        const { show } = this.state;

        return show ? (
            <div className='SnackBar SnackBar-show'>
                <span >{i18n.t('Press ', SNACKBAR_NAMESPACE)()}</span>
                <span className='SnackBar-esc'>{i18n.t('esc', SNACKBAR_NAMESPACE)()}</span>
                <span >{i18n.t(' to exit full screen', SNACKBAR_NAMESPACE)()}</span>
            </div>
        ) : <div />;
    }
}