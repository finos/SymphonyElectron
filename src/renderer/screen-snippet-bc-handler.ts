import { Event, ipcRenderer } from 'electron';
import { apiCmds, apiName, IScreenSnippet } from '../common/api-interface';

/**
 * @deprecated user openScreenSnippet instead
 */
export class ScreenSnippetBcHandler {
  /**
   * capture method to support backward compatibility
   *
   * @deprecated user openScreenSnippet instead
   */
  public capture(): Promise<IScreenSnippet> {
    return new Promise((resolve, reject) => {
      ipcRenderer.send(apiName.symphonyApi, {
        cmd: apiCmds.openScreenSnippet,
      });
      ipcRenderer.on(
        'screen-snippet-data',
        (_event: Event, arg: IScreenSnippet) => {
          if (arg.type === 'ERROR') {
            reject(arg);
            return;
          }
          resolve(arg);
        },
      );
    });
  }
  /**
   * cancel capture method to support backward compatibility
   *
   * @deprecated user closeScreenSnippet instead
   */
  public cancel() {
    ipcRenderer.send(apiName.symphonyApi, {
      cmd: apiCmds.closeScreenSnippet,
    });
  }
}
