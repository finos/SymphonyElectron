import { IMenu } from '../interfaces/menu.interface';

export abstract class SdaMenuHoC implements IMenu {
  public abstract getState: any;
  public abstract getActions: any;
}
