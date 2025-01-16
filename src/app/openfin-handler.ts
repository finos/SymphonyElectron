import { connect } from '@openfin/node-adapter';
import { logger } from '../common/openfin-logger';
import { config, IConfig } from './config-handler';
import { windowHandler } from './window-handler';

export class OpenfinHandler {
  private interopClient;
  private intentHandlerSubscriptions = new Map();
  private isConnected: boolean = false;

  /**
   * Connection to interop brocker
   */
  public async connect() {
    logger.info('openfin-handler: connecting');
    const { openfin }: IConfig = config.getConfigFields(['openfin']);
    if (openfin) {
      const fin = await connect({
        uuid: openfin.uuid,
        licenseKey: openfin.licenseKey,
        runtime: {
          version: openfin.runtimeVersion,
        },
      });
      logger.info('openfin-handler: connected');
      logger.info('openfin-handler: connecting to interop broker');
      this.interopClient = fin.Interop.connectSync(
        'workspace-platform-starter',
      );
      this.isConnected = true;
      this.interopClient.onDisconnection((event) => {
        const { brokerName } = event;
        logger.warn(
          `openfin-handler: Disconnected from Interop Broker ${brokerName} `,
        );
        this.clearSubscriptions();
      });
      return;
    }
    logger.error('openfin-handler: missing openfin params to connect.');
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
  public async registerIntentHandler(intentName: string) {
    const unsubscriptionCallback =
      await this.interopClient.registerIntentHandler(
        this.intentHandler,
        intentName,
      );
    this.intentHandlerSubscriptions.set(intentName, unsubscriptionCallback);
  }

  /**
   * Removes an intent handler for a given intent
   */
  public unregisterIntentHandler(intentName) {
    const unsubscriptionCallback =
      this.intentHandlerSubscriptions.get(intentName);
    unsubscriptionCallback.unsubscribe();
    this.intentHandlerSubscriptions.delete(intentName);
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
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Returns connection status and provider name
   */
  public getInfo() {
    return {
      provider: 'Openfin',
      isConnected: this.getConnectionStatus(),
    };
  }

  private intentHandler = (intent: any) => {
    logger.info('openfin-handler: intent received - ', intent);
    const mainWebContents = windowHandler.getMainWebContents();
    mainWebContents?.send('intent-received', intent.name);
  };
}

const openfinHandler = new OpenfinHandler();

export { openfinHandler };
