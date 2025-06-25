import { IMenuSingleton, IMenuStore } from '../interfaces/menu.interface';
import { Key, Value } from '../interfaces/store.interface';
import { BaseSingleton } from './Singleton/BaseSingleton';

export class MenuStore implements IMenuStore<IMenuSingleton> {
  private singleton: BaseSingleton<IMenuSingleton>;
  constructor() {
    this.singleton = new BaseSingleton<IMenuSingleton>();
  }
  public get = (key: Key<IMenuSingleton>) => {
    return this.singleton.getValue(key);
  };

  public set = (
    modifiedPropertyKey: Key<IMenuSingleton>,
    newData: Value<IMenuSingleton>,
  ) => {
    this.singleton.setValue(modifiedPropertyKey, newData);
  };
}
