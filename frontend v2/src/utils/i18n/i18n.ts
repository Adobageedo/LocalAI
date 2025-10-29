/**
 * i18n Utilities
 * Internationalisation et détection de langue
 * Migré depuis /frontend/src/utils/i18n.ts
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/config/locales';

/**
 * Obtenir la langue d'Outlook via Office.js
 * Utilise le contexte Office pour détecter la langue d'affichage
 */
export function getOutlookLanguage(): string {
  try {
    // Vérifier si Office.js est disponible
    if (typeof Office !== 'undefined' && Office.context?.displayLanguage) {
      const outlookLang = Office.context.displayLanguage.toLowerCase();
      
      // Mapper les codes langue Outlook vers les codes supportés
      const langMap: Record<string, string> = {
        'en-us': 'en',
        'en-gb': 'en',
        'es-es': 'es',
        'es-mx': 'es',
        'fr-fr': 'fr',
        'fr-ca': 'fr',
        'de-de': 'de',
        'pt-br': 'pt',
        'pt-pt': 'pt',
        'it-it': 'it',
        'nl-nl': 'nl',
        'ru-ru': 'ru',
        'ja-jp': 'ja',
        'zh-cn': 'zh',
        'zh-tw': 'zh'
      };
      
      // Chercher une correspondance exacte
      if (langMap[outlookLang]) {
        return langMap[outlookLang];
      }
      
      // Essayer avec les deux premiers caractères
      const shortCode = outlookLang.substring(0, 2);
      if (Object.values(SUPPORTED_LOCALES).includes(shortCode as any)) {
        return shortCode;
      }
    }
  } catch (error) {
    console.warn('Error detecting Outlook language:', error);
  }
  
  // Fallback sur la langue du navigateur
  try {
    if (navigator.language) {
      const browserLang = navigator.language.toLowerCase().substring(0, 2);
      if (Object.values(SUPPORTED_LOCALES).includes(browserLang as any)) {
        return browserLang;
      }
    }
  } catch (error) {
    console.warn('Error detecting browser language:', error);
  }
  
  // Fallback final sur la langue par défaut
  return DEFAULT_LOCALE;
}

/**
 * Obtenir la langue actuelle de l'utilisateur
 */
export function getCurrentLanguage(): string {
  // Chercher dans le localStorage
  try {
    const savedLang = localStorage.getItem('language');
    if (savedLang && Object.values(SUPPORTED_LOCALES).includes(savedLang as any)) {
      return savedLang;
    }
  } catch (error) {
    console.warn('Error reading language from localStorage:', error);
  }
  
  // Sinon, détecter automatiquement
  return getOutlookLanguage();
}

/**
 * Sauvegarder la langue de l'utilisateur
 */
export function saveLanguage(language: string): void {
  try {
    localStorage.setItem('language', language);
  } catch (error) {
    console.error('Error saving language to localStorage:', error);
  }
}

/**
 * Obtenir le nom d'une langue dans sa langue native
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
    pt: 'Português',
    it: 'Italiano',
    nl: 'Nederlands',
    ru: 'Русский',
    ja: '日本語',
    zh: '中文'
  };
  
  return names[code] || code.toUpperCase();
}

/**
 * Vérifier si une langue est supportée
 */
export function isLanguageSupported(code: string): boolean {
  return Object.values(SUPPORTED_LOCALES).includes(code as any);
}

/**
 * Obtenir toutes les langues supportées
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return Object.values(SUPPORTED_LOCALES).map(code => ({
    code,
    name: getLanguageName(code)
  }));
}

/**
 * Détecter la direction du texte pour une langue
 */
export function getTextDirection(language: string): 'ltr' | 'rtl' {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(language) ? 'rtl' : 'ltr';
}

/**
 * Formater un nombre selon la locale
 */
export function formatNumber(value: number, language: string): string {
  try {
    return new Intl.NumberFormat(language).format(value);
  } catch {
    return value.toString();
  }
}

/**
 * Formater une date selon la locale
 */
export function formatDate(date: Date, language: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(language, options).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

/**
 * Formater une heure selon la locale
 */
export function formatTime(date: Date, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/**
 * Obtenir le séparateur décimal pour une langue
 */
export function getDecimalSeparator(language: string): string {
  const separators: Record<string, string> = {
    en: '.',
    fr: ',',
    es: ',',
    de: ',',
    pt: ',',
    it: ',',
    nl: ','
  };
  
  return separators[language] || '.';
}

/**
 * Obtenir le séparateur de milliers pour une langue
 */
export function getThousandsSeparator(language: string): string {
  const separators: Record<string, string> = {
    en: ',',
    fr: ' ',
    es: '.',
    de: '.',
    pt: '.',
    it: '.',
    nl: '.'
  };
  
  return separators[language] || ',';
}
