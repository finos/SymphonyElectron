import { IPodSettingsClientSpecificSupportLink } from '../../common/api-interface';
import { BaseSingleton } from './Singleton/BaseSingleton';

export class SDAMenuStore {
  protected helpMenuSingleton =
    new BaseSingleton<IPodSettingsClientSpecificSupportLink>();

  public getHelpMenuSingleton = () => {
    return this.helpMenuSingleton;
  };
}
