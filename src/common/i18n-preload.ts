import { IntlMessageFormat } from 'intl-messageformat';
import { formatString } from './utils';

const localeCodeRegex = /^([a-z]{2})-([A-Z]{2})$/;

export type LocaleType = 'en-US' | 'ja-JP' | 'fr-FR';

type formatterFunction = (args?: object) => string;

class Translation {
  /**
   * Returns translated string with respect to value, resource & name space
   *
   * @param value {string} key field in the resources
   * @param resource {string} current locale resource
   * @param namespace {string} name space in the resource
   */
  private static translate(
    value: string,
    resource: JSON | null,
    namespace: string | undefined,
  ): string {
    return resource
      ? Translation.getResource(resource, namespace)[value] || value
      : value;
  }

  private static getResource = (
    resource: JSON,
    namespace: string | undefined,
  ): JSON => (namespace ? resource[namespace] : resource);
  private locale: LocaleType = 'en-US';
  private loadedResources: object = {};

  /**
   * Apply the locale for translation
   *
   * @param locale
   */
  public setLocale(locale: LocaleType): void {
    const localeMatch: string[] | null = locale.match(localeCodeRegex);
    if (!locale && (!localeMatch || localeMatch.length < 1)) {
      return;
    }

    this.locale = locale;
  }

  /**
   * Gets the current locale
   *
   * @return LocaleType {string}
   */
  public getLocale(): LocaleType {
    return this.locale;
  }

  /**
   * fetches and returns the translated value
   *
   * @param value {string}
   * @param namespace {string}
   * @example t('translate and formats {data} ', namespace)({ data: 'string' })
   * @returns translate and formats string
   */
  public t(value: string, namespace?: string): formatterFunction {
    return (args?: Record<string, any>): string => {
      let translatedString: string;
      if (this.loadedResources && this.loadedResources[this.locale]) {
        translatedString = Translation.translate(
          value,
          this.loadedResources[this.locale],
          namespace,
        );
      } else {
        const resource = this.loadResource(this.locale);
        translatedString =
          Translation.translate(value, resource, namespace) || value;
      }
      if (args && Object.keys(args).length > 0) {
        try {
          const msg = new IntlMessageFormat(translatedString, this.locale);
          return msg.format(args) as string;
        } catch (error: any) {
          return formatString(translatedString, args);
        }
      }
      return translatedString;
    };
  }

  /**
   * Keeps ref of loaded resources from the main process
   *
   * @param locale {LocaleType}
   * @param resource {JSON}
   */
  public setResource(locale: LocaleType, resource: JSON): void {
    this.locale = locale;
    this.loadedResources = resource;
  }

  /**
   * Reads the resources dir and returns the data
   *
   * @param locale
   */
  private loadResource(locale: LocaleType): JSON | null {
    return this.loadedResources[locale];
  }
}

const i18n = new Translation();

export { i18n };
