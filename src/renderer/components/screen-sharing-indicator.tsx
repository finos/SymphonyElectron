import classNames from 'classnames';
import { ipcRenderer, remote     } from 'electron';
import * as React from 'react';

import { apiCmds, apiName } from '../../common/api-interface';
import { isMac } from '../../common/env';
import { i18n } from '../../common/i18n-preload';

interface IState {
    id: number;
}

type mouseEventButton = React.MouseEvent<HTMLButtonElement>;
/**
 * Window that display a banner when the users starting sharing screen
 */
export default class ScreenSharingIndicator extends React.Component<{}, IState> {

    private readonly eventHandlers = {
        onStopScreenSharing: (id: number) => (_event: mouseEventButton) => this.stopScreenShare(id),
        onClose: () => this.close(),
    };

    constructor(props) {
        super(props);
        this.state = {
            id: 0,
        };
        this.updateState = this.updateState.bind(this);
    }

    /**
     * main render function
     */
    public render(): JSX.Element {
        const { id } = this.state;
        const namespace = 'ScreenSharingIndicator';
        return (
            <div className={classNames('ScreenSharingIndicator', { mac: isMac })}>
                <span className='drag-area'/>
                <span className='text-label'>{i18n.t(`You are sharing your screen on {appName}`, namespace)({ appName: remote.app.getName() })}</span>
                <span className='buttons'>
                    <a className='hide-button' href='#' onClick={this.eventHandlers.onClose}>{i18n.t('Hide', namespace)()}</a>
                    <button className='stop-sharing-button' onClick={this.eventHandlers.onStopScreenSharing(id)}>
                        {i18n.t('Stop sharing', namespace)()}
                    </button>
                </span>
            </div>
        );
    }

    public componentDidMount(): void {
        ipcRenderer.on('screen-sharing-indicator-data', this.updateState);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener('screen-sharing-indicator-data', this.updateState);
    }

    /**
     * Stops sharing screen
     *
     * @param id
     */
    private stopScreenShare(id: number): void {
        ipcRenderer.send('stop-screen-sharing', id);
    }

    /**
     * Closes the screen sharing indicator window
     */
    private close(): void {
        ipcRenderer.send(apiName.symphonyApi, {
            cmd: apiCmds.closeWindow,
            windowType: 'screen-sharing-indicator',
        });
    }

    /**
     * Sets the About app state
     *
     * @param _event
     * @param data {Object} { buildNumber, clientVersion, version }
     */
    private updateState(_event, data): void {
        this.setState(data as IState);
    }
}