import * as fs from 'fs';
import * as path from 'path';

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
  public loadedResources: object = {};
  private locale: LocaleType = 'en-US';

  /**
   * Apply the locale for translation
   *
   * @param locale
   */
  public setLocale(locale: LocaleType): void {
    if (!this.isValidLocale(locale)) {
      return;
    }

    this.locale = locale;
    if (!this.loadedResources[this.locale]) {
      this.loadResource(this.locale);
    }
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
   * Validates the locale using Regex
   *
   * @param locale {LocaleType}
   */
  public isValidLocale(locale: LocaleType): boolean {
    if (!locale) {
      return false;
    }
    const localeMatch: string[] | null = locale.match(localeCodeRegex);
    return !(!locale && (!localeMatch || localeMatch.length < 1));
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
    return (args?: object): string => {
      if (this.loadedResources && this.loadedResources[this.locale]) {
        return formatString(
          Translation.translate(
            value,
            this.loadedResources[this.locale],
            namespace,
          ),
          args,
        );
      }
      const resource = this.loadResource(this.locale);
      return formatString(
        Translation.translate(value, resource, namespace) || value,
        args,
      );
    };
  }

  /**
   * Reads the resources dir and returns the data
   *
   * @param locale
   */
  private loadResource(locale: LocaleType): JSON | null {
    const filename = `${locale}.json`;
    // nosemgrep
    const resourcePath = path.resolve(__dirname, '..', 'locale', filename);

    if (!fs.existsSync(resourcePath)) {
      return null;
    }

    return (this.loadedResources[this.locale] = require(resourcePath));
  }
}

const i18n = new Translation();

export { i18n };
