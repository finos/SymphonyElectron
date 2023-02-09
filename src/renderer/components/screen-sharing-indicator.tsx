import classNames from 'classnames';
import { ipcRenderer } from 'electron';
import * as React from 'react';
import { productName } from '../../../package.json';

import { apiCmds, apiName } from '../../common/api-interface';
import { isMac } from '../../common/env';
import { i18n } from '../../common/i18n-preload';

interface IState {
  id: number;
  streamId: string;
}

const SCREEN_SHARING_NAMESPACE = 'ScreenSharingIndicator';

type mouseEventButton = React.MouseEvent<HTMLButtonElement>;
/**
 * Window that display a banner when the users starting sharing screen
 */
export default class ScreenSharingIndicator extends React.Component<
  {},
  IState
> {
  private readonly eventHandlers = {
    onStopScreenSharing: (id: number) => (_event: mouseEventButton) =>
      this.stopScreenShare(id),
    onClose: () => this.close(),
  };

  constructor(props) {
    super(props);
    this.state = {
      id: 0,
      streamId: '',
    };
    this.updateState = this.updateState.bind(this);
  }

  /**
   * Renders the component
   */
  public render(): JSX.Element {
    const { id } = this.state;

    return (
      <div className={classNames('ScreenSharingIndicator', { mac: isMac })}>
        <span className='text-label'>{this.getLabelInBold()}</span>
        <span className='buttons'>
          <button
            className='stop-sharing-button'
            onClick={this.eventHandlers.onStopScreenSharing(id)}
          >
            {i18n.t('Stop sharing', SCREEN_SHARING_NAMESPACE)()}
          </button>
        </span>
      </div>
    );
  }

  /**
   * Callback to handle event when a component is mounted
   */
  public componentDidMount(): void {
    ipcRenderer.on('screen-sharing-indicator-data', this.updateState);
  }

  /**
   * Callback to handle event when a component is unmounted
   */
  public componentWillUnmount(): void {
    ipcRenderer.removeListener(
      'screen-sharing-indicator-data',
      this.updateState,
    );
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
    const { streamId } = this.state;
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeWindow,
      windowType: 'screen-sharing-indicator',
      winKey: streamId,
    });
  }

  /**
   * Sets the component state
   *
   * @param _event
   * @param data {Object} { buildNumber, clientVersion, version }
   */
  private updateState(_event, data): void {
    this.setState(data as IState);
  }

  /**
   * Put App name in bold
   */
  private getLabelInBold(): JSX.Element {
    const appName = productName || 'Symphony';
    const translatedLabel = i18n.t(
      `You are sharing your screen on {appName}`,
      SCREEN_SHARING_NAMESPACE,
    )({ appName });
    const appNameStartPosition = translatedLabel.indexOf(appName);
    if (appNameStartPosition === -1) {
      return <>{translatedLabel}</>;
    }
    const appNameEndPosition = appNameStartPosition + appName.length;
    return (
      <>
        {`${translatedLabel.slice(0, appNameStartPosition)}`}
        <b> {appName} </b>
        {translatedLabel.slice(appNameEndPosition)}
      </>
    );
  }
}
