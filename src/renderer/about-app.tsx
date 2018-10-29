import * as React from 'react';

/**
 * Window that display app version and copyright info
 */
export default class AboutBox extends React.Component {

    private readonly eventHandlers = {
        onSubmit: () => this.handleSubmit(),
    };

    constructor() {
        super();
    }

    /**
     * test
     */
    public handleSubmit(): void {
        console.log('test');
    }

    /**
     * main render function
     */
    public render() {
        return (
            <div className='content'>
                <img className='logo' src='symphony-logo.png'/>
                <span id='app-name' className='name'>Symphony</span>
                <span id='version' className='version-text'/>
                <span id='copyright' className='copyright-text' onclick={this.eventHandlers.onSubmit()}/>
            </div>
        );
    }
}