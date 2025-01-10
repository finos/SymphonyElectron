import { app, WebContents } from 'electron';
import { createConnection, Socket } from 'net';
import { logger } from '../common/c9-logger';

let isAppQuitting = false;

app.on('before-quit', () => {
  isAppQuitting = true;
});

class C9PipeHandler {
  private _socket: Socket | undefined;

  /**
   * Connects to the C9 pipe server. Errors will be reported as events.
   * @param sender Where to send incoming events
   * @param pipe pipe identifier
   */
  public connect(sender: WebContents, pipe: string) {
    let connectionSuccess = false;
    if (!pipe.startsWith('symphony-c9-')) {
      logger.info('c9-pipe: Invalid pipe name specified: ' + pipe);
      sender.send('c9-pipe-event', {
        event: 'connection-failed',
        arg: 'invalid pipe',
      });
      return;
    }

    const path = '\\\\?\\pipe\\' + pipe;
    logger.info('c9-pipe: Connecting to ' + path);
    const client = createConnection(path, () => {
      connectionSuccess = true;
      logger.info('c9-pipe: Connected to ' + path);
      sender.send('c9-pipe-event', { event: 'connected' });
    });
    this._socket = client;

    client.on('data', (data) => {
      sender.send('c9-pipe-event', { event: 'data', arg: data });
    });
    client.on('close', () => {
      // If the socket is successfully connected, the close is coming from the server side, or
      // is otherwise unexpected. In this case, send close event to the extension so it can go
      // into a reconnect loop.
      if (connectionSuccess) {
        logger.info('c9-pipe: Server closed ' + path);
        sender.send('c9-pipe-event', { event: 'close' });
        this._socket?.destroy();
      }
    });
    client.on('error', (err: Error) => {
      // If the connection is already established, any error will also result in a 'close' event
      // and will be handled above.
      logger.info('c9-pipe: Error from ' + path, err);
      if (!connectionSuccess) {
        sender.send('c9-pipe-event', {
          event: 'connection-failed',
          arg: err.message,
        });
      }
    });
  }

  /**
   * Writes data to the pipe
   * @param data the data to be written
   */
  public write(data: Uint8Array) {
    this._socket?.write(data);
  }

  /**
   * Closes an open pipe
   */
  public close() {
    logger.info('c9-pipe: Closing pipe');
    this._socket?.destroy();
    this._socket = undefined;
  }

  /**
   * Returns whether the pipe is open
   */
  public isConnected() {
    return this._socket !== undefined;
  }
}

let c9PipeHandler: C9PipeHandler | undefined;

/**
 * Connects to the C9 pipe server. Errors will be reported as callbacks.
 * @param sender Where to send incoming events
 * @param pipe pipe identifier
 */
export const connectC9Pipe = (sender: WebContents, pipe: string) => {
  if (isAppQuitting) {
    logger.info(
      'c9-pipe-handler: App is quitting, preventing c9 pipe connect.',
    );
    return;
  }
  if (!c9PipeHandler) {
    c9PipeHandler = new C9PipeHandler();
  } else {
    if (c9PipeHandler.isConnected()) {
      c9PipeHandler.close();
    }
  }
  c9PipeHandler.connect(sender, pipe);
};

/**
 * Writes data to the pipe
 * @param data the data to be written
 */
export const writeC9Pipe = (data: Uint8Array) => {
  if (isAppQuitting) {
    return;
  }
  c9PipeHandler?.write(data);
};

/**
 * Closes an open pipe
 */
export const closeC9Pipe = () => {
  c9PipeHandler?.close();
};
