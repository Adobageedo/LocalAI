/**
 * Language Context
 * Context pour gérer la langue de l'application
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/config/locales';
import { getOutlookLanguage, getCurrentLanguage, saveLanguage } from '@/utils/i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  availableLanguages: string[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * Language Provider Component
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<string>(DEFAULT_LOCALE);

  /**
   * Initialiser la langue au montage
   */
  useEffect(() => {
    // Essayer d'obtenir la langue depuis localStorage
    const savedLanguage = getCurrentLanguage();
    
    // Sinon, détecter depuis Outlook
    const detectedLanguage = savedLanguage || getOutlookLanguage();
    
    setLanguageState(detectedLanguage);
  }, []);

  /**
   * Changer la langue
   */
  const setLanguage = (lang: string) => {
    if (Object.values(SUPPORTED_LOCALES).includes(lang as any)) {
      setLanguageState(lang);
      saveLanguage(lang);
      
      // Mettre à jour l'attribut HTML lang
      document.documentElement.lang = lang;
    } else {
      console.warn(`Language ${lang} is not supported`);
    }
  };

  /**
   * Mettre à jour l'attribut lang au changement
   */
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const availableLanguages = Object.values(SUPPORTED_LOCALES);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook pour utiliser le LanguageContext
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
}
