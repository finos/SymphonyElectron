import { Themes } from './components/notification-settings';

export const whiteColorRegExp = new RegExp(
  /^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i,
);
export const darkTheme = [
  '#e23030',
  '#b5616a',
  '#ab8ead',
  '#ebc875',
  '#a3be77',
  '#58c6ff',
  '#ebab58',
];

export const Colors = {
  dark: {
    regularFlashingNotificationBgColor: '#27588e',
    notificationBackgroundColor: '#27292c',
    notificationBorderColor: '#717681',
    mentionBackgroundColor: '#99342c',
    mentionBorderColor: '#ff5d50',
  },
  light: {
    regularFlashingNotificationBgColor: '#aad4f8',
    notificationBackgroundColor: '#f1f1f3',
    notificationBorderColor: 'transparent',
    mentionBackgroundColor: '#fcc1b9',
    mentionBorderColor: 'transparent',
  },
};

export type Theme = '' | Themes.DARK | Themes.LIGHT;
const LIGHT_THEME = '#EAEBEC';
const DARK_THEME = '#25272B';

/**
 * Validates the color
 * @param color
 * @private
 */
export const isValidColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6})/.test(color);
};

/**
 * SDA versions prior to 9.2.3 do not support theme color properly, reason why SFE-lite is pushing notification default background color and theme.
 * For that reason, we try to identify if provided color is the default one or not.
 * @param color color sent through SDABridge
 * @returns boolean
 */
export const isCustomColor = (color: string): boolean => {
  return !!(color && color !== LIGHT_THEME && color !== DARK_THEME);
};

/**
 * This function aims at providing toast notification css classes
 */
export const getContainerCssClasses = (
  theme,
  flash,
  isExternal,
  hasMention,
): string[] => {
  const customClasses: string[] = [];
  if (flash && theme) {
    if (isExternal) {
      customClasses.push('external-border');
      if (hasMention) {
        customClasses.push(`${theme}-ext-mention-flashing`);
      } else {
        customClasses.push(`${theme}-ext-flashing`);
      }
    } else if (hasMention) {
      customClasses.push(`${theme}-mention-flashing`);
    } else {
      // In case it's a regular message notification
      customClasses.push(`${theme}-flashing`);
    }
  } else if (isExternal) {
    customClasses.push('external-border');
  }
  return customClasses;
};

/**
 * Function that allows to increase color brightness
 * @param hex hes color
 * @param percent percent
 * @returns new hex color
 */
export const increaseBrightness = (hex: string, percent: number) => {
  // strip the leading # if it's there
  hex = hex.replace(/^\s*#|\s*$/g, '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  return (
    '#' +
    // tslint:disable-next-line: no-bitwise
    (0 | ((1 << 8) + r + ((256 - r) * percent) / 100)).toString(16).substr(1) +
    // tslint:disable-next-line: no-bitwise
    (0 | ((1 << 8) + g + ((256 - g) * percent) / 100)).toString(16).substr(1) +
    // tslint:disable-next-line: no-bitwise
    (0 | ((1 << 8) + b + ((256 - b) * percent) / 100)).toString(16).substr(1)
  );
};

/**
 * Returns custom border color
 * @param theme current theme
 * @param customColor color
 * @returns custom border color
 */
export const getThemedCustomBorderColor = (
  theme: string,
  customColor: string,
) => {
  return theme === Themes.DARK
    ? increaseBrightness(customColor, 50)
    : 'transparent';
};

/**
 * Returns notification colors based on theme
 */
export const getThemeColors = (
  theme,
  flash,
  isExternal,
  hasMention,
  color,
): { [key: string]: string } => {
  const currentColors =
    theme === Themes.DARK ? { ...Colors.dark } : { ...Colors.light };
  const externalFlashingBackgroundColor =
    theme === Themes.DARK ? '#70511f' : '#f6e5a6';
  if (flash && theme) {
    if (isExternal) {
      if (!hasMention) {
        currentColors.notificationBorderColor = '#F7CA3B';
        currentColors.notificationBackgroundColor =
          externalFlashingBackgroundColor;
        if (isCustomColor(color)) {
          currentColors.notificationBorderColor = getThemedCustomBorderColor(
            theme,
            color,
          );
          currentColors.notificationBackgroundColor = color;
        }
      } else {
        currentColors.notificationBorderColor = '#F7CA3B';
      }
    } else if (hasMention) {
      currentColors.notificationBorderColor =
        currentColors.notificationBorderColor;
    } else {
      // in case of regular message without mention
      // FYI: SDA versions prior to 9.2.3 do not support theme color properly, reason why SFE-lite is pushing notification default background color.
      // For this reason, to be backward compatible, we check if sent color correspond to 'default' background color. If yes, we should ignore it and not consider it as a custom color.
      currentColors.notificationBackgroundColor = isCustomColor(color)
        ? color
        : currentColors.regularFlashingNotificationBgColor;
      currentColors.notificationBorderColor = isCustomColor(color)
        ? getThemedCustomBorderColor(theme, color)
        : theme === Themes.DARK
        ? '#2996fd'
        : 'transparent';
    }
  } else if (!flash) {
    if (hasMention) {
      currentColors.notificationBackgroundColor =
        currentColors.mentionBackgroundColor;
      currentColors.notificationBorderColor = currentColors.mentionBorderColor;
    } else if (isCustomColor(color)) {
      currentColors.notificationBackgroundColor = color;
      currentColors.notificationBorderColor = getThemedCustomBorderColor(
        theme,
        color,
      );
    } else if (isExternal) {
      currentColors.notificationBorderColor = '#F7CA3B';
    }
  }
  return currentColors;
};
