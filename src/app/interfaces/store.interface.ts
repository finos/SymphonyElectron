export interface IStore<T> {
  get: (key: Key<T>) => Value<T> | undefined;
  set: (modifiedPropertyKey: Key<T>, value: Value<T>) => void;
}

export type Key<T> = keyof T;
export type Value<T> = T[keyof T];
