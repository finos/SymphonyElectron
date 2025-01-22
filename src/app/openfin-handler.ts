import { connect } from '@openfin/node-adapter';
import { randomUUID, UUID } from 'crypto';
import { logger } from '../common/openfin-logger';
import { config, IConfig } from './config-handler';
import { windowHandler } from './window-handler';

const OPENFIN_PROVIDER = 'Openfin';
const TIMEOUT_THRESHOLD = 10000;

export class OpenfinHandler {
  private interopClient;
  private intentHandlerSubscriptions: Map<UUID, any> = new Map();
  private isConnected: boolean = false;
  private fin: any;

  /**
   * Connection to interop brocker
   */
  public async connect() {
    const { openfin }: IConfig = config.getConfigFields(['openfin']);
    if (!openfin) {
      logger.error('openfin-handler: missing openfin params to connect.');
      return { isConnected: false };
    }
    logger.info('openfin-handler: connecting');
    const parsedTimeoutValue = parseInt(openfin.connectionTimeout, 10);
    const timeoutValue = isNaN(parsedTimeoutValue)
      ? TIMEOUT_THRESHOLD
      : parsedTimeoutValue;
    const connectionTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        logger.error(
          `openfin-handler: Connection timeout after ${
            timeoutValue / 1000
          } seconds`,
        );
        return reject(
          new Error(`Connection timeout after ${timeoutValue / 1000} seconds`),
        );
      }, timeoutValue),
    );

    const connectionPromise = (async () => {
      try {
        if (!this.fin) {
          this.fin = await connect({
            uuid: openfin.uuid,
            licenseKey: openfin.licenseKey,
            runtime: {
              version: openfin.runtimeVersion,
            },
          });
        }

        logger.info(
          'openfin-handler: connection established to Openfin runtime',
        );
        logger.info(
          `openfin-handler: starting connection to interop broker using channel ${openfin.channelName}`,
        );

        this.interopClient = this.fin.Interop.connectSync(openfin.channelName);
        this.isConnected = true;

        this.interopClient.onDisconnection((event) => {
          const { brokerName } = event;
          logger.warn(
            `openfin-handler: Disconnected from Interop Broker ${brokerName}`,
          );
          this.clearSubscriptions();
        });

        return true;
      } catch (error) {
        logger.error('openfin-handler: error while connecting: ', error);
        return false;
      }
    })();

    try {
      const isConnected = await Promise.race([
        connectionPromise,
        connectionTimeoutPromise,
      ]);
      return { isConnected };
    } catch (error) {
      logger.error(
        'openfin-handler: error or timeout while connecting: ',
        error,
      );
      return { isConnected: false };
    }
  }

  /**
   * Sends an intent to the Interop Broker
   */
  public fireIntent(intent) {
    this.interopClient.fireIntent(intent);
  }

  /**
   * Adds an intent handler for incoming intents
   */
  public async registerIntentHandler(intentName: string): Promise<UUID> {
    const unsubscriptionCallback =
      await this.interopClient.registerIntentHandler(
        this.intentHandler,
        intentName,
      );
    const uuid = randomUUID();
    this.intentHandlerSubscriptions.set(uuid, unsubscriptionCallback);
    return uuid;
  }

  /**
   * Removes an intent handler for a given intent
   */
  public unregisterIntentHandler(uuid: UUID) {
    const unsubscriptionCallback = this.intentHandlerSubscriptions.get(uuid);
    unsubscriptionCallback.unsubscribe();
    this.intentHandlerSubscriptions.delete(uuid);
  }

  /**
   * Join all Interop Clients at the given identity to context group contextGroupId. If no target is specified, it adds the sender to the context group.
   */
  public async joinContextGroup(contextGroupId: string, target?: any) {
    await this.interopClient.joinContextGroup(contextGroupId, target);
  }

  /**
   * Returns the Interop-Broker-defined context groups available for an entity to join.
   */
  public async getContextGroups() {
    return this.interopClient.getContextGroups();
  }

  /**
   * Gets all clients for a context group.
   */
  public getAllClientsInContextGroup(contextGroupId: string) {
    return this.interopClient.getAllClientsInContextGroup(contextGroupId);
  }

  /**
   * Clears all openfin subscriptions
   */
  public clearSubscriptions() {
    this.isConnected = false;
    this.interopClient = undefined;
    this.intentHandlerSubscriptions.forEach(
      (unsubscriptionCallback, intent) => {
        try {
          unsubscriptionCallback.unsubscribe();
        } catch (e) {
          logger.error(
            `openfin-handler: Error unsubscribing from intent ${intent}:`,
            e,
          );
        }
      },
    );
    this.intentHandlerSubscriptions.clear();
  }

  /**
   * Returns openfin connection status
   */
  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
    };
  }

  /**
   * Returns connection status and provider name
   */
  public getInfo() {
    return {
      provider: OPENFIN_PROVIDER,
      isConnected: this.getConnectionStatus().isConnected,
    };
  }

  private intentHandler = (intent: any) => {
    logger.info('openfin-handler: intent received - ', intent);
    const mainWebContents = windowHandler.getMainWebContents();
    mainWebContents?.send('intent-received', intent);
  };
}

const openfinHandler = new OpenfinHandler();

export { openfinHandler };
