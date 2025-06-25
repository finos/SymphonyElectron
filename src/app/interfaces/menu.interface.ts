import {
  INotificationClientSettings,
  IPodSettingsClientSpecificSupportLink,
} from '../../common/api-interface';
import { IStore } from './store.interface';

export interface IMenu {
  getState: () => any;
  getActions: () => any;
}

export interface ISDAMenuStore {
  helpCenter: IPodSettingsClientSpecificSupportLink;
}

export interface IMenuStore<T> extends IStore<T> {}

export interface IMenuSingleton {
  helpCenter: IPodSettingsClientSpecificSupportLink;
  clientNotificationSettings: INotificationClientSettings;
}

export interface IBaseContextMenuState {
  value?: any;
  label?: string;
  visible: boolean;
}

export interface IBaseContextMenuActions {
  click: (...args) => void;
}

export interface IHelpContextMenuState extends IBaseContextMenuState {
  value?: IPodSettingsClientSpecificSupportLink;
  label?: string;
  visible: boolean;
}

export interface IHelpContextMenuActions extends IBaseContextMenuActions {
  click: () => void;
}

export interface INotificationZoomContextMenuState
  extends IBaseContextMenuState {
  value?: INotificationClientSettings;
  label?: string;
  visible: boolean;
}
