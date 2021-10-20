import { WebContents } from 'electron';

export class MainProcessEvents {
  private registeredWebContents: Map<string, Set<WebContents>> = new Map<
    string,
    Set<Electron.WebContents>
  >();

  /**
   * Broadcasts events to all the registered webContents
   * @param eventName
   * @param args
   */
  public publish(eventName: string, args?: any[]) {
    const allWebContests = this.registeredWebContents.get(eventName);
    if (!allWebContests) {
      return;
    }
    allWebContests.forEach((w) => {
      if (w && !w.isDestroyed()) {
        w.send(eventName, args);
      }
    });
  }

  /**
   * Subscribe multiple events for the webContents
   * @param eventNames
   * @param webContents
   */
  public subscribeMultipleEvents(
    eventNames: string[],
    webContents: WebContents,
  ) {
    eventNames.forEach((e) => this.subscribe(e, webContents));
  }

  /**
   * Unsubscribe multiple events for the webContents
   * @param eventNames
   * @param webContents
   */
  public unsubscribeMultipleEvents(
    eventNames: string[],
    webContents: WebContents,
  ) {
    eventNames.forEach((e) => this.unsubscribe(e, webContents));
  }

  /**
   * Subscribe event for the webContents
   * @param eventName
   * @param webContents
   */
  public subscribe(eventName: string, webContents: WebContents) {
    if (!webContents || webContents.isDestroyed()) {
      return;
    }
    const registeredWebContents = this.registeredWebContents.get(eventName);
    if (registeredWebContents) {
      const isRegistered = registeredWebContents.has(webContents);
      if (isRegistered) {
        return;
      }
      registeredWebContents.add(webContents);
      return;
    }
    this.registeredWebContents.set(eventName, new Set<WebContents>());
    this.registeredWebContents.get(eventName)!.add(webContents);
  }

  /**
   * Unsubscribe an event from a specific webContents
   * @param eventName
   * @param webContents
   */
  public unsubscribe(eventName: string, webContents: WebContents) {
    if (!webContents || webContents.isDestroyed()) {
      return;
    }
    const registeredWebContents = this.registeredWebContents.get(eventName);
    if (registeredWebContents) {
      if (registeredWebContents.has(webContents)) {
        registeredWebContents.delete(webContents);
      }
    }
  }
}

const mainEvents = new MainProcessEvents();

export { mainEvents };
