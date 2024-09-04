type DefaulCallback = ([...arg]) => void;
export class BaseSingleton<T> {
  protected helpCenterKeyword = {
    value: 'value',
    subscriber: 0,
  };
  protected baseSingletonObject = new Map<string, T>();
  protected baseSingletonSubscription = new Map<number, DefaulCallback>();

  public getValue = () => {
    return this.baseSingletonObject.get(this.helpCenterKeyword.value);
  };

  public setValue = (baseSingletonObject: T) => {
    this.baseSingletonObject.set(
      this.helpCenterKeyword.value,
      baseSingletonObject,
    );

    Array.from(this.baseSingletonSubscription.values()).forEach((callback) => {
      callback([baseSingletonObject]);
    });
  };

  public getSubscriber = (id: number) => {
    return this.baseSingletonSubscription.get(id);
  };

  public subscribe = (callback: any): number => {
    this.helpCenterKeyword.subscriber++;
    this.baseSingletonSubscription.set(
      this.helpCenterKeyword.subscriber,
      callback,
    );

    return this.helpCenterKeyword.subscriber;
  };

  public unsubscribe = (subscriberId: number): number => {
    this.baseSingletonSubscription.delete(subscriberId);

    return subscriberId;
  };
}
