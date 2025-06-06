import * as fs from 'fs';
import * as path from 'path';

import { i18n, LocaleType } from '../src/common/i18n';
import * as commonUtils from '../src/common/utils';

jest.mock('fs');
jest.mock('path');

const mockEnUsResource = {
  greeting: 'Hello',
  farewell: 'Goodbye',
  user: {
    welcome: 'Welcome, {name}!',
    messages: '{count, plural, =1 {1 message} other {# messages}}',
  },
  templateKey: 'Hello {name}',
  malformedSyntaxKey: 'This is a {malformed value',
};

const mockFrFrResource = {
  greeting: 'Bonjour',
  user: {
    welcome: 'Bienvenue, {name}!',
  },
};

describe('i18n Translation', () => {
  let originalLoadedResources: object;
  let originalLocale: LocaleType;

  beforeEach(() => {
    originalLoadedResources = { ...i18n.loadedResources };
    originalLocale = i18n.getLocale();
    i18n.loadedResources = {};
    i18n.setLocale('en-US');

    jest.clearAllMocks();

    (path.resolve as jest.Mock).mockImplementation((...args: string[]) =>
      args.join('/'),
    );

    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    i18n.loadedResources = originalLoadedResources;
    i18n.setLocale(originalLocale);
  });

  describe('isValidLocale', () => {
    it('should return true for valid locales', () => {
      expect(i18n.isValidLocale('en-US')).toBe(true);
      expect(i18n.isValidLocale('fr-FR')).toBe(true);
      expect(i18n.isValidLocale('ja-JP')).toBe(true);
    });

    it('should return false for invalid or malformed locales', () => {
      expect(i18n.isValidLocale(null as any)).toBe(false);
      expect(i18n.isValidLocale('' as any)).toBe(false);
    });
  });

  describe('setLocale and getLocale', () => {
    it('should set and get a valid locale', () => {
      const localeToSet: LocaleType = 'fr-FR';
      (fs.existsSync as jest.Mock).mockImplementation((p) =>
        p.endsWith(`${localeToSet}.json`),
      );

      i18n.setLocale(localeToSet);
      expect(i18n.getLocale()).toBe(localeToSet);
      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(`${localeToSet}.json`),
      );
    });

    it('should not change locale if an invalid locale is set', () => {
      const initialLocale = i18n.getLocale();
      i18n.setLocale('' as any);
      expect(i18n.getLocale()).toBe(initialLocale);
    });
  });

  describe('t (translate function)', () => {
    beforeEach(() => {
      i18n.loadedResources['en-US'] = mockEnUsResource;
      i18n.setLocale('en-US');
    });

    it('should translate a key for the current locale (en-US)', () => {
      expect(i18n.t('greeting')()).toBe('Hello');
    });

    it('should translate a namespaced key', () => {
      expect(i18n.t('welcome', 'user')()).toBe('Welcome, {name}!');
    });

    it('should return the key itself if translation is not found', () => {
      expect(i18n.t('non Existent Key')()).toBe('non Existent Key');
    });

    it('should return the key if the key is not found within an existing namespace', () => {
      expect(i18n.t('non Existent Key In User', 'user')()).toBe(
        'non Existent Key In User',
      );
    });

    it('should format translated string with arguments using IntlMessageFormat mock', () => {
      expect(i18n.t('welcome', 'user')({ name: 'Tester' })).toBe(
        'Welcome, Tester!',
      );
      expect(i18n.t('messages', 'user')({ count: 1 })).toBe('1 message');
      expect(i18n.t('messages', 'user')({ count: 5 })).toBe('5 messages');
    });

    it('should use commonUtils.formatString as fallback if IntlMessageFormat throws error', () => {
      const formatStringSpy = jest
        .spyOn(commonUtils, 'formatString')
        .mockReturnValue('Fallback Formatted String');

      const result = i18n.t('malformedSyntaxKey')({ value: 'test' });

      expect(formatStringSpy).toHaveBeenCalledWith(
        mockEnUsResource.malformedSyntaxKey,
        { value: 'test' },
      );
      expect(result).toBe('Fallback Formatted String');

      formatStringSpy.mockRestore();
    });

    it('should translate correctly if resources are loaded for a different locale', () => {
      i18n.loadedResources['fr-FR'] = mockFrFrResource;
      i18n.setLocale('fr-FR');
      expect(i18n.t('greeting')()).toBe('Bonjour');
      expect(i18n.t('welcome', 'user')({ name: 'Ami' })).toBe(
        'Bienvenue, Ami!',
      );
    });

    it('should return the key if current locale resource is explicitly null', () => {
      i18n.setLocale('xx-XX' as any);
      i18n.loadedResources['xx-XX'] = null;
      expect(i18n.t('some Key For Null Resource')()).toBe(
        'some Key For Null Resource',
      );
    });

    it('should handle translation call with no arguments (template returned)', () => {
      expect(i18n.t('templateKey')()).toBe('Hello {name}');
    });

    it('should handle translation call with empty arguments object (template returned)', () => {
      expect(i18n.t('templateKey')({})).toBe('Hello {name}');
    });
  });
});
