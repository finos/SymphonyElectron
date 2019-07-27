import { ipcRenderer } from 'electron';
import * as React from 'react';

import { i18n } from '../../common/i18n-preload';

interface IProps {
    error: ERROR | string;
}

enum ERROR {
    NETWORK_OFFLINE = 'NETWORK_OFFLINE',
}

const NETWORK_ERROR_NAMESPACE = 'NetworkError';

/**
 * Window that display app version and copyright info
 */
export default class NetworkError extends React.Component<IProps, {}> {

    private readonly eventHandlers = {
        onRetry: () => this.retry(),
    };

    constructor(props) {
        super(props);
    }

    /**
     * main render function
     */
    public render(): JSX.Element {
        const { error } = this.props;
        return (
            <div id='main-content'>
                <div className='NetworkError-icon'>
                    <svg width='60' viewBox='0 0 50 60' fill='none'>
                        <path
                            d='M40 20.111V9.653c0-2.142-1.1-4.153-2.883-5.255C34.458 2.754 28.7 0 20 0 11.3 0 5.542 2.754 2.883 4.407 1.1 5.5 0 7.511 0 9.653v15.705l31.667 9.618v6.995c0 .945-.567 1.61-1.534 2.108L20 49.404 9.808 44.052c-.908-.472-1.475-1.136-1.475-2.08v-5.247L0 34.102v7.87c0 4.319 2.358 7.991 6.108 9.906L20 59.46l13.833-7.546C37.642 49.963 40 46.291 40 41.971V28.855L8.333 19.237v-7.983C10.6 10.108 14.45 8.744 20 8.744s9.4 1.364 11.667 2.51v6.234L40 20.111z'
                            fill='#0098FF'
                        />
                        <path
                            d='M40 20.111V9.653c0-2.142-1.1-4.153-2.883-5.255C34.458 2.754 28.7 0 20 0 11.3 0 5.542 2.754 2.883 4.407 1.1 5.5 0 7.511 0 9.653v15.705l31.667 9.618v6.995c0 .945-.567 1.61-1.534 2.108L20 49.404 9.808 44.052c-.908-.472-1.475-1.136-1.475-2.08v-5.247L0 34.102v7.87c0 4.319 2.358 7.991 6.108 9.906L20 59.46l13.833-7.546C37.642 49.963 40 46.291 40 41.971V28.855L8.333 19.237v-7.983C10.6 10.108 14.45 8.744 20 8.744s9.4 1.364 11.667 2.51v6.234L40 20.111z'
                            fill='url(#prefix__paint0_radial)'
                        />
                        <defs>
                            <radialGradient
                                id='prefix__paint0_radial'
                                cx={0}
                                cy={0}
                                r={1}
                                gradientUnits='userSpaceOnUse'
                                gradientTransform='matrix(0 40.259 -50.3704 0 20.07 0)'>
                                <stop stopColor='#fff' stopOpacity={0.4} />
                                <stop offset={1} stopColor='#fff' stopOpacity={0} />
                            </radialGradient>
                        </defs>
                    </svg>
                </div>
                <div className='main-message'>
                    <p className='NetworkError-header'>
                        {i18n.t('Problem connecting to Symphony', NETWORK_ERROR_NAMESPACE)()}
                    </p>
                    <p id='NetworkError-reason'>
                        {i18n.t(`Looks like you are not connected to the Internet. We'll try to reconnect automatically.`, NETWORK_ERROR_NAMESPACE)()}
                    </p>
                    <div id='error-code' className='NetworkError-error-code'>
                        {error || ERROR.NETWORK_OFFLINE}
                    </div>
                    <button id='retry-button' onClick={this.eventHandlers.onRetry} className='NetworkError-button'>
                        {i18n.t('Retry', NETWORK_ERROR_NAMESPACE)()}
                    </button>
                </div>
            </div>
        );
    }

    /**
     * reloads the application
     */
    private retry(): void {
        ipcRenderer.send('reload-symphony');
    }

}
