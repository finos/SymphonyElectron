import { remote } from 'electron';
import * as React from 'react';

/**
 * Window that display app version and copyright info
 */
export default class LoadingScreen extends React.PureComponent {

    /**
     * main render function
     */
    public render() {
        const appName = remote.app.getName() || 'Symphony';
        return (
            <div className='LoadingScreen'>
                <img className='LoadingScreen-logo' src='assets/symphony-logo.png' />
                    <span className='LoadingScreen-name'>{appName}</span>
                    <svg width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 200' preserveAspectRatio='xMidYMid'>
                        <circle cx='50' cy='50' fill='none' ng-attr-stroke='{{config.color}}' ng-attr-stroke-width='{{config.width}}' ng-attr-r='{{config.radius}}' ng-attr-stroke-dasharray='{{config.dasharray}}' stroke='#ffffff' stroke-width='10' r='35' stroke-dasharray='164.93361431346415 56.97787143782138' transform='rotate(59.6808 50 50)'>
                            <animateTransform attributeName='transform' type='rotate' calcMode='linear' values='0 50 50;360 50 50' keyTimes='0;1' dur='1s' begin='0s' repeatCount='indefinite'/>
                        </circle>
                    </svg>
            </div>
        );
    }
}