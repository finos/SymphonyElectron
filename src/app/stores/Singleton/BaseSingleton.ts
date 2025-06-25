import { Key, Value } from '../../interfaces/store.interface';

type DefaulCallback = ([...arg]) => void;

export class BaseSingleton<T> {
  protected subscriber = 0;
  protected baseSingletonObject = new Map<Key<T>, Value<T>>();
  protected baseSingletonSubscription = new Map<number, DefaulCallback>();

  public getValue = (key: Key<T>) => {
    return this.baseSingletonObject.get(key);
  };

  public setValue = (key: Key<T>, value: Value<T>) => {
    this.baseSingletonObject.set(key, value);

    Array.from(this.baseSingletonSubscription.values()).forEach((callback) => {
      callback([key, value]);
    });
  };

  public getSubscriber = (id: number) => {
    return this.baseSingletonSubscription.get(id);
  };

  public subscribe = (callback: any): number => {
    this.subscriber++;
    this.baseSingletonSubscription.set(this.subscriber, callback);

    return this.subscriber;
  };

  public unsubscribe = (subscriberId: number): number => {
    this.baseSingletonSubscription.delete(subscriberId);

    return subscriberId;
  };
}
