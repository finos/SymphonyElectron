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
                    <span id='LoadingScreen-appName' className='name'>{appName}</span>
            </div>
        );
    }
}