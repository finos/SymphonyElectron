/// <reference types="@openfin/core/fin" />

import { connect, NodeFin } from '@openfin/node-adapter';
import { randomUUID, UUID } from 'crypto';
import { logger } from '../common/openfin-logger';
import { config, IConfig } from './config-handler';
import { windowHandler } from './window-handler';

const OPENFIN_PROVIDER = 'OpenFin';
const TIMEOUT_THRESHOLD = 10000;

export class OpenfinHandler {
  private interopClient: OpenFin.InteropClient | undefined;
  private intentHandlerSubscriptions: Map<UUID, any> = new Map();
  private sessionContextGroups: Map<string, OpenFin.SessionContextGroup> =
    new Map();
  private isConnected: boolean = false;
  private fin: NodeFin | undefined;

  /**
   * Connection to interop broker
   */
  public async connect() {
    this.reset();

    const { openfin }: IConfig = config.getConfigFields(['openfin']);
    if (!openfin) {
      logger.error('openfin-handler: missing openfin params to connect.');
      return { isConnected: false };
    }
    logger.info('openfin-handler: connecting...');

    const parsedTimeoutValue = parseInt(openfin.connectionTimeout, 10);
    const timeoutValue = isNaN(parsedTimeoutValue)
      ? TIMEOUT_THRESHOLD
      : parsedTimeoutValue;
    const connectionTimeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `connection timeout after ${timeoutValue / 1000} seconds`,
            ),
          ),
        timeoutValue,
      ),
    );

    const connectionPromise = (async () => {
      try {
        if (!this.fin) {
          this.fin = await connect({
            uuid: openfin.uuid,
            licenseKey: openfin.licenseKey,
            runtime: {
              version: openfin.runtimeVersion || 'stable',
            },
          });
        }

        logger.info(
          'openfin-handler: connection established to openfin runtime',
        );
        logger.info(
          `openfin-handler: starting connection to interop broker using channel ${openfin.platformUuid}...`,
        );

        this.interopClient = this.fin.Interop.connectSync(openfin.platformUuid);
        this.isConnected = true;
        this.interopClient?.onDisconnection(this.disconnectionHandler);

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
        'openfin-handler: error or timeout while connecting:',
        error,
      );
      return { isConnected: false };
    }
  }

  /**
   * Sends an intent to the Interop Broker
   */
  public fireIntent(intent) {
    return this.interopClient?.fireIntent(intent);
  }

  /**
   * Adds an intent handler for incoming intents
   */
  public async registerIntentHandler(intentName: string): Promise<UUID> {
    const subscription = await this.interopClient?.registerIntentHandler(
      this.intentHandler,
      intentName,
    );

    const uuid = randomUUID();
    this.intentHandlerSubscriptions.set(uuid, subscription);
    return uuid;
  }

  /**
   * Removes an intent handler for a given intent
   */
  public async unregisterIntentHandler(uuid: UUID) {
    const subscription = this.intentHandlerSubscriptions.get(uuid);
    if (subscription) {
      const response = await subscription.unsubscribe();
      this.intentHandlerSubscriptions.delete(uuid);
      return response;
    }
  }

  /**
   * Join all Interop Clients at the given identity to context group contextGroupId. If no target is specified, it adds the sender to the context group.
   */
  public async joinContextGroup(contextGroupId: string, target?: any) {
    return this.interopClient?.joinContextGroup(contextGroupId, target);
  }

  /**
   * Joins or create a context group that does not persist between runs and aren't present on snapshots.
   */
  public async joinSessionContextGroup(contextGroupId: string) {
    return this.interopClient
      ?.joinSessionContextGroup(contextGroupId)
      .then((sessionContextGroup) => {
        this.sessionContextGroups.set(
          sessionContextGroup.id,
          sessionContextGroup,
        );
        return sessionContextGroup.id;
      });
  }

  /**
   * Returns the Interop-Broker-defined context groups available for an entity to join.
   */
  public async getContextGroups() {
    return this.interopClient?.getContextGroups();
  }

  /**
   * Gets all clients for a context group.
   */
  public async getAllClientsInContextGroup(contextGroupId: string) {
    return this.interopClient?.getAllClientsInContextGroup(contextGroupId);
  }

  /**
   * Reset connection status, interop client, and existing subscriptions (if any).
   */
  public reset() {
    this.isConnected = false;
    this.interopClient = undefined;
    this.intentHandlerSubscriptions.forEach((subscriptions, intent) => {
      try {
        subscriptions.unsubscribe();
      } catch (e) {
        logger.error(
          `openfin-handler: error unsubscribing from intent ${intent}:`,
          e,
        );
      }
    });
    this.intentHandlerSubscriptions.clear();

    this.sessionContextGroups.clear();
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
   * Returns provider name
   */
  public getInfo() {
    return {
      provider: OPENFIN_PROVIDER,
      fdc3Version: '2.0',
      optionalFeatures: {
        OriginatingAppMetadata: false,
        UserChannelMembershipAPIs: false,
        DesktopAgentBridging: false,
      },
      appMetadata: null,
    };
  }

  /**
   * Fires an intent for a given context
   * @param context
   */
  public fireIntentForContext(context: any) {
    return this.interopClient?.fireIntentForContext(context);
  }

  /**
   * Sets a context for the current context group.
   * If no session context group is specified, the context is set for the current context group (joined through joinContextGroup).
   * If a session context group is specified, the context is set for the given session context group (joined through joinSessionContextGroup).
   * @param context
   */
  public setContext(context: any, sessionContextGroupId?: string) {
    if (sessionContextGroupId) {
      return this.sessionContextGroups
        .get(sessionContextGroupId)
        ?.setContext(context);
    }
    return this.interopClient?.setContext(context);
  }

  /**
   * Leaves current context group
   */
  public removeFromContextGroup() {
    return this.interopClient?.removeFromContextGroup();
  }

  /**
   * Returns client name
   *
   */
  public getClientInfo(): unknown {
    const { openfin }: IConfig = config.getConfigFields(['openfin']);

    return {
      name: openfin?.uuid || '',
    };
  }

  /**
   * Forward intent to main window when intent is received
   */
  private intentHandler = (intent: any) => {
    logger.info('openfin-handler: intent received - ', intent);
    windowHandler.getMainWebContents()?.send('openfin-intent-received', intent);
  };

  /**
   * Forward disconnection event to main window when disconnected from Interop Broker
   */
  private disconnectionHandler = (
    event: OpenFin.InteropBrokerDisconnectionEvent,
  ) => {
    logger.warn(
      `openfin-handler: disconnected from interop broker ${event.brokerName}`,
    );
    windowHandler.getMainWebContents()?.send('openfin-disconnection', event);
    this.reset();
  };
}

const openfinHandler = new OpenfinHandler();

export { openfinHandler };
