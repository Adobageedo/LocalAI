/**
 * Configuration Index
 * Export centralisé de toutes les configurations
 */

// API Configuration
export * from './api';

// Constants
export {
  LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  INFO_MESSAGES,
  TIMEOUTS,
  VALIDATION_REGEX,
  HTTP_STATUS,
  TONE_TYPES,
  TEMPLATE_CATEGORIES,
  USER_ROLES,
  LOG_LEVELS
} from './constants';

// Re-export avec renommage pour éviter les conflits
export { ANALYTICS_EVENTS as ANALYTICS_EVENT_TYPES } from './constants';
export { STORAGE_KEYS as STORAGE_KEY_CONSTANTS } from './constants';

// Features & Feature Flags
export * from './features';

// Quick Actions
export * from './quickActions';

// Themes
export * from './themes';

// File Types
export * from './fileTypes';

// Locales & i18n
export * from './locales';

// Routes
export * from './routes';

// Analytics (exports spécifiques pour éviter conflits)
export {
  ANALYTICS_CONFIG,
  ANALYTICS_EVENTS,
  EVENT_CATEGORIES,
  AUTO_TRACKED_PROPERTIES,
  USER_PROPERTIES,
  SESSION_PROPERTIES,
  CUSTOM_METRICS,
  CUSTOM_DIMENSIONS,
  CONVERSION_GOALS,
  SAMPLING_CONFIG,
  PRIVACY_CONFIG,
  isAnalyticsEnabled,
  getAnalyticsConfig
} from './analytics';

// Storage (exports spécifiques pour éviter conflits)
export {
  STORAGE_KEYS,
  STORAGE_TTL,
  PERSISTENT_KEYS,
  SENSITIVE_KEYS,
  SESSION_ONLY_KEYS,
  MAX_STORAGE_SIZE,
  STORAGE_PREFIXES,
  CLEANUP_CONFIG,
  COMPRESSION_CONFIG,
  BACKUP_CONFIG,
  STORAGE_EVENTS,
  QUOTA_LIMITS,
  isPersistentKey,
  isSensitiveKey,
  isSessionOnlyKey,
  getTTL,
  getMaxSize,
  getStorageKey
} from './storage';

export type { StorageItem, StorageKey } from './storage';

/**
 * Configuration globale de l'application
 */
export const APP_CONFIG = {
  name: 'Outlook AI Assistant',
  version: '2.0.0',
  description: 'Assistant IA intelligent pour Microsoft Outlook',
  author: 'Your Company',
  supportEmail: 'support@example.com',
  websiteUrl: 'https://example.com',
  
  // Informations techniques
  apiVersion: 'v1',
  minSupportedVersion: '1.0.0',
  
  // Features
  features: {
    emailGeneration: true,
    emailCorrection: true,
    emailReformulation: true,
    emailSummarization: true,
    templateSystem: true,
    chatInterface: true,
    attachmentAnalysis: true
  },
  
  // Limites globales
  limits: {
    maxFileSizeMB: 10,
    maxAttachments: 5,
    maxEmailLengthChars: 50000
  },
  
  // Liens externes
  externalLinks: {
    documentation: 'https://docs.example.com',
    helpCenter: 'https://help.example.com',
    privacyPolicy: 'https://example.com/privacy',
    termsOfService: 'https://example.com/terms',
    github: 'https://github.com/yourorg/outlook-ai-assistant'
  }
} as const;

/**
 * Type pour la configuration de l'app
 */
export type AppConfig = typeof APP_CONFIG;

/**
 * Obtenir la version de l'application
 */
export function getAppVersion(): string {
  return APP_CONFIG.version;
}

/**
 * Obtenir le nom de l'application
 */
export function getAppName(): string {
  return APP_CONFIG.name;
}

/**
 * Vérifier si une feature est supportée
 */
export function isFeatureSupported(featureName: keyof typeof APP_CONFIG.features): boolean {
  return APP_CONFIG.features[featureName] === true;
}
