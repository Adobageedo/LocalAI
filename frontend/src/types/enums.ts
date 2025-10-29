// Centralized enums
export enum EmailTone {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  CASUAL = 'casual',
  URGENT = 'urgent',
  APOLOGETIC = 'apologetic'
}

export enum SupportedLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  PORTUGUESE = 'pt',
  ITALIAN = 'it',
  DUTCH = 'nl',
  RUSSIAN = 'ru',
  JAPANESE = 'ja',
  CHINESE = 'zh'
}

export enum EmailProvider {
  OUTLOOK = 'outlook',
  GMAIL = 'gmail'
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
