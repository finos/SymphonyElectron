export interface IRegistry {
  currentChannel: string | 'beta' | 'latest';
}

export const EChannelRegistry = {
  /**
   * Has higher authority over autoUpdateChannel, utilized to set Update Channel to LATEST
   */
  LATEST: 'latest',

  /**
   * Has higher authority over autoUpdateChannel, utilized to set Update Channel to BETA
   */
  BETA: 'beta',
};

class Registry {
  private registry: IRegistry = { currentChannel: '' };
  public getRegistry = (): IRegistry => {
    return { ...this.registry };
  };

  public setRegistry = (newRegistry: IRegistry) => {
    this.registry = { ...this.registry, ...newRegistry };
  };
}

export const RegistryStore = new Registry();
