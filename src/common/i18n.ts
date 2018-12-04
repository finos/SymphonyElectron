import * as fs from 'fs';
import * as path from 'path';

import { formatString } from './utils';

const localeCodeRegex = /^([a-z]{2})-([A-Z]{2})$/;

export type LocaleType = 'en-US' | 'ja-JP';

class Translation {
    private static translate = (value: string, resource) => resource[value];
    private locale: LocaleType = 'en-US';
    private loadedResource: object = {};

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
     */
    public getLocale(): LocaleType {
        return this.locale;
    }

    /**
     * fetches and returns the translated value
     *
     * @param value {string}
     * @param data {object}
     */
    public t(value: string, data?: object): string {
        if (this.loadedResource && this.loadedResource[this.locale]) {
            return formatString(Translation.translate(value, this.loadedResource[this.locale]));
        }
        const resource = this.loadResource(this.locale);
        return formatString(resource ? resource[value] : value || value, data);
    }

    /**
     * Reads the resources dir and returns the data
     *
     * @param locale
     */
    public loadResource(locale: LocaleType): object | null {
        const resourcePath = path.resolve(__dirname, '..', 'locale', `${locale}.json`);

        if (!fs.existsSync(resourcePath)) {
            // logger.error(`Translation: locale resource path does not exits ${resourcePath}`);
            return null;
        }

        return this.loadedResource[this.locale] = require(resourcePath);
    }

}

const i18n = new Translation();

export { i18n };