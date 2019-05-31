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
                    <svg id='Layer_1' xmlns='http://www.w3.org/2000/svg' width='50' viewBox='0 0 19.7 32'>
                        <g id='Page-1'>
                            <g id='Symphony_logo'>
                                <g id='logo2'>
                                    <linearGradient id='Shape_8_' gradientUnits='userSpaceOnUse' x1='39.819'
                                                    y1='23.981' x2='39.246' y2='23.726' gradientTransform='matrix(7.6157 0 0 -3.458 -295.325 101.04)'>
                                        <stop offset='0' stopColor='#197a68'/>
                                        <stop offset='1' stopColor='#329d87'/>
                                    </linearGradient>
                                    <path id='Shape' className='st0' d='M2.4,17.4c0,1.2,0.3,2.4,0.8,3.5l6.8-3.5H2.4z'
                                    />
                                    <linearGradient id='Shape_9_' gradientUnits='userSpaceOnUse' x1='28.916'
                                                    y1='22.811' x2='29.916' y2='22.811' gradientTransform='matrix(2.7978 0 0 -4.7596 -73.704 128.374)'>
                                        <stop offset='0' stopColor='#1d7e7b'/>
                                        <stop offset='1' stopColor='#35b0b7'/>
                                    </linearGradient>
                                    <path id='Shape_1_' className='st1' d='M7.2,21.3C8,21.9,9,22.2,10,22.2v-4.8L7.2,21.3z'
                                    />
                                    <linearGradient id='Shape_10_' gradientUnits='userSpaceOnUse' x1='37.958'
                                                    y1='21.136' x2='38.178' y2='21.868' gradientTransform='matrix(6.1591 0 0 -11.4226 -223.952 256.877)'>
                                        <stop offset='0' stopColor='#175952'/>
                                        <stop offset='1' stopColor='#3a8f88'/>
                                    </linearGradient>
                                    <path id='Shape_2_' className='st2' d='M14.4,6.9C13,6.3,11.5,6,10,6C9.4,6,8.8,6,8.2,6.1L10,17.4L14.4,6.9z'
                                    />
                                    <linearGradient id='Shape_11_' gradientUnits='userSpaceOnUse' x1='40.569'
                                                    y1='22.098' x2='41.029' y2='22.377' gradientTransform='matrix(9.5186 0 0 -5.5951 -373.339 140.324)'>
                                        <stop offset='0' stopColor='#39a8ba'/>
                                        <stop offset='1' stopColor='#3992b4'/>
                                    </linearGradient>
                                    <path id='Shape_3_' className='st3' d='M10,17.4h9.5c0-2-0.6-4-1.8-5.6L10,17.4z'
                                    />
                                    <linearGradient id='Shape_12_' gradientUnits='userSpaceOnUse' x1='41.214'
                                                    y1='22.325' x2='40.706' y2='22.548' gradientTransform='matrix(9.9955 0 0 -5.2227 -404.796 132.876)'>
                                        <stop offset='0' stopColor='#021c3c'/>
                                        <stop offset='1' stopColor='#215180'/>
                                    </linearGradient>
                                    <path id='Shape_4_' className='st4' d='M1.5,12.2c-1,1.6-1.5,3.4-1.5,5.2h10L1.5,12.2z'
                                    />
                                    <linearGradient id='Shape_13_' gradientUnits='userSpaceOnUse' x1='33.511'
                                                    y1='22.151' x2='34.511' y2='22.151' gradientTransform='matrix(3.9169 0 0 -6.6631 -125.178 161.684)'>
                                        <stop offset='0' stopColor='#23796c'/>
                                        <stop offset='1' stopColor='#41beaf'/>
                                    </linearGradient>
                                    <path id='Shape_5_' className='st5' d='M10,10.8c-1.4,0-2.8,0.4-3.9,1.3l3.9,5.4V10.8z'
                                    />
                                    <linearGradient id='Shape_14_' gradientUnits='userSpaceOnUse' x1='36.129'
                                                    y1='21.958' x2='36.487' y2='21.481' gradientTransform='matrix(5.0353 0 0 -8.5671 -171.59 208.333)'>
                                        <stop offset='0' stopColor='#14466a'/>
                                        <stop offset='1' stopColor='#286395'/>
                                    </linearGradient>
                                    <path id='Shape_6_' className='st6' d='M10,26c1.8,0,3.6-0.6,5-1.6l-5-6.9V26z'
                                    />
                                    <linearGradient id='Shape_15_' gradientUnits='userSpaceOnUse' x1='38.534'
                                                    y1='23.656' x2='39.087' y2='23.578' gradientTransform='matrix(6.663 0 0 -3.5931 -244.84 102.835)'>
                                        <stop offset='0' stopColor='#261d49'/>
                                        <stop offset='1' stopColor='#483a6d'/>
                                    </linearGradient>
                                    <path id='Shape_7_' className='st7' d='M16.6,16.4l-6.6,1l6.2,2.6c0.3-0.8,0.5-1.7,0.5-2.6C16.7,17.1,16.6,16.7,16.6,16.4z'
                                    />
                                </g>
                            </g>
                        </g>
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
