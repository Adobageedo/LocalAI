/**
 * Locales Configuration
 * Configuration des langues supportées et traductions
 */

/**
 * Langues supportées par l'application
 */
export const SUPPORTED_LOCALES = {
  EN: 'en',
  FR: 'fr',
  ES: 'es',
  DE: 'de',
  IT: 'it',
  PT: 'pt',
  NL: 'nl'
} as const;

/**
 * Langue par défaut
 */
export const DEFAULT_LOCALE = SUPPORTED_LOCALES.FR;

/**
 * Noms des langues dans leur langue native
 */
export const LOCALE_NAMES = {
  [SUPPORTED_LOCALES.EN]: 'English',
  [SUPPORTED_LOCALES.FR]: 'Français',
  [SUPPORTED_LOCALES.ES]: 'Español',
  [SUPPORTED_LOCALES.DE]: 'Deutsch',
  [SUPPORTED_LOCALES.IT]: 'Italiano',
  [SUPPORTED_LOCALES.PT]: 'Português',
  [SUPPORTED_LOCALES.NL]: 'Nederlands'
} as const;

/**
 * Options de ton traduites
 */
export const TONE_OPTIONS = {
  professional: {
    en: 'Professional',
    fr: 'Professionnel',
    es: 'Profesional',
    de: 'Professionell',
    it: 'Professionale',
    pt: 'Profissional',
    nl: 'Professioneel'
  },
  friendly: {
    en: 'Friendly',
    fr: 'Amical',
    es: 'Amigable',
    de: 'Freundlich',
    it: 'Amichevole',
    pt: 'Amigável',
    nl: 'Vriendelijk'
  },
  formal: {
    en: 'Formal',
    fr: 'Formel',
    es: 'Formal',
    de: 'Formell',
    it: 'Formale',
    pt: 'Formal',
    nl: 'Formeel'
  },
  casual: {
    en: 'Casual',
    fr: 'Décontracté',
    es: 'Casual',
    de: 'Lässig',
    it: 'Informale',
    pt: 'Casual',
    nl: 'Informeel'
  },
  urgent: {
    en: 'Urgent',
    fr: 'Urgent',
    es: 'Urgente',
    de: 'Dringend',
    it: 'Urgente',
    pt: 'Urgente',
    nl: 'Urgent'
  },
  apologetic: {
    en: 'Apologetic',
    fr: 'Excuses',
    es: 'Disculpa',
    de: 'Entschuldigung',
    it: 'Scuse',
    pt: 'Desculpa',
    nl: 'Verontschuldigend'
  }
} as const;

/**
 * Format de date par locale
 */
export const DATE_FORMATS = {
  [SUPPORTED_LOCALES.EN]: 'MM/DD/YYYY',
  [SUPPORTED_LOCALES.FR]: 'DD/MM/YYYY',
  [SUPPORTED_LOCALES.ES]: 'DD/MM/YYYY',
  [SUPPORTED_LOCALES.DE]: 'DD.MM.YYYY',
  [SUPPORTED_LOCALES.IT]: 'DD/MM/YYYY',
  [SUPPORTED_LOCALES.PT]: 'DD/MM/YYYY',
  [SUPPORTED_LOCALES.NL]: 'DD-MM-YYYY'
} as const;

/**
 * Format de temps par locale
 */
export const TIME_FORMATS = {
  [SUPPORTED_LOCALES.EN]: 'h:mm A',
  [SUPPORTED_LOCALES.FR]: 'HH:mm',
  [SUPPORTED_LOCALES.ES]: 'HH:mm',
  [SUPPORTED_LOCALES.DE]: 'HH:mm',
  [SUPPORTED_LOCALES.IT]: 'HH:mm',
  [SUPPORTED_LOCALES.PT]: 'HH:mm',
  [SUPPORTED_LOCALES.NL]: 'HH:mm'
} as const;

/**
 * Séparateurs décimaux par locale
 */
export const DECIMAL_SEPARATORS = {
  [SUPPORTED_LOCALES.EN]: '.',
  [SUPPORTED_LOCALES.FR]: ',',
  [SUPPORTED_LOCALES.ES]: ',',
  [SUPPORTED_LOCALES.DE]: ',',
  [SUPPORTED_LOCALES.IT]: ',',
  [SUPPORTED_LOCALES.PT]: ',',
  [SUPPORTED_LOCALES.NL]: ','
} as const;

/**
 * Séparateurs de milliers par locale
 */
export const THOUSANDS_SEPARATORS = {
  [SUPPORTED_LOCALES.EN]: ',',
  [SUPPORTED_LOCALES.FR]: ' ',
  [SUPPORTED_LOCALES.ES]: '.',
  [SUPPORTED_LOCALES.DE]: '.',
  [SUPPORTED_LOCALES.IT]: '.',
  [SUPPORTED_LOCALES.PT]: '.',
  [SUPPORTED_LOCALES.NL]: '.'
} as const;

/**
 * Direction du texte par locale
 */
export const TEXT_DIRECTION = {
  [SUPPORTED_LOCALES.EN]: 'ltr',
  [SUPPORTED_LOCALES.FR]: 'ltr',
  [SUPPORTED_LOCALES.ES]: 'ltr',
  [SUPPORTED_LOCALES.DE]: 'ltr',
  [SUPPORTED_LOCALES.IT]: 'ltr',
  [SUPPORTED_LOCALES.PT]: 'ltr',
  [SUPPORTED_LOCALES.NL]: 'ltr'
} as const;

/**
 * Type pour les locales supportées
 */
export type Locale = typeof SUPPORTED_LOCALES[keyof typeof SUPPORTED_LOCALES];

/**
 * Obtenir le nom d'une locale
 */
export function getLocaleName(locale: Locale): string {
  return LOCALE_NAMES[locale] || LOCALE_NAMES[DEFAULT_LOCALE];
}

/**
 * Obtenir le format de date pour une locale
 */
export function getDateFormat(locale: Locale): string {
  return DATE_FORMATS[locale] || DATE_FORMATS[DEFAULT_LOCALE];
}

/**
 * Obtenir le format de temps pour une locale
 */
export function getTimeFormat(locale: Locale): string {
  return TIME_FORMATS[locale] || TIME_FORMATS[DEFAULT_LOCALE];
}

/**
 * Obtenir la direction du texte pour une locale
 */
export function getTextDirection(locale: Locale): 'ltr' | 'rtl' {
  return TEXT_DIRECTION[locale] as 'ltr' | 'rtl';
}

/**
 * Vérifier si une locale est supportée
 */
export function isLocaleSupported(locale: string): boolean {
  return Object.values(SUPPORTED_LOCALES).includes(locale as Locale);
}

/**
 * Obtenir la locale du navigateur
 */
export function getBrowserLocale(): Locale {
  const browserLang = navigator.language.split('-')[0];
  return isLocaleSupported(browserLang) ? (browserLang as Locale) : DEFAULT_LOCALE;
}

/**
 * Obtenir la traduction d'un ton
 */
export function getToneTranslation(tone: keyof typeof TONE_OPTIONS, locale: Locale): string {
  return TONE_OPTIONS[tone][locale] || TONE_OPTIONS[tone][DEFAULT_LOCALE];
}

/**
 * Configuration des nombres par locale
 */
export interface NumberFormatConfig {
  decimal: string;
  thousands: string;
}

/**
 * Obtenir la configuration des nombres pour une locale
 */
export function getNumberFormat(locale: Locale): NumberFormatConfig {
  return {
    decimal: DECIMAL_SEPARATORS[locale] || DECIMAL_SEPARATORS[DEFAULT_LOCALE],
    thousands: THOUSANDS_SEPARATORS[locale] || THOUSANDS_SEPARATORS[DEFAULT_LOCALE]
  };
}
