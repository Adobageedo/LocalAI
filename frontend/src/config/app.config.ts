export const APP_CONFIG = {
  name: 'LocalAI Outlook Add-in',
  version: '1.0.0',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'it', 'nl', 'ru', 'ja', 'zh'],
  features: {
    styleAnalysis: true,
    emailSync: true,
    templateGeneration: true,
  }
} as const;
