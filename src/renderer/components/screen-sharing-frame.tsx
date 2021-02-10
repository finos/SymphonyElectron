import classNames from 'classnames';
import * as React from 'react';

/**
 * Window that display app version and copyright info
 */
export default class ScreenSharingFrame extends React.Component<{}> {
  /**
   * main render function
   */
  public render(): JSX.Element {
    return <div className={classNames('ScreenSharingFrame')}></div>;
  }
}
