import { IClientSpecificSupportLink } from '../../common/api-interface';
import { BaseSingleton } from './Singleton/BaseSingleton';

export class SDAMenuStore {
  protected helpMenuSingleton = new BaseSingleton<IClientSpecificSupportLink>();

  public getHelpMenuSingleton = () => {
    return this.helpMenuSingleton;
  };
}
