import {remote} from 'electron';
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
            <div className='content'>
                <img className='logo' src='assets/symphony-logo.png' />
                    <span id='app-name' className='name'>{appName}</span>
                    <span id='version' className='version-text'/>
                    <span id='copyright' className='copyright-text'/>
            </div>
        );
    }
}