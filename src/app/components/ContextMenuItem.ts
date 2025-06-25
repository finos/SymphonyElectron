import { SdaMenuHoC } from '../HoC/sda-menu-hoc';

export class ContextMenuItem<T, R> extends SdaMenuHoC {
  protected state: T;
  protected actions: R;
  constructor(state: T, actions: R) {
    super();
    this.state = state;
    this.actions = actions;
  }

  public getState = () => this.state;
  public getActions = () => this.actions;
}
