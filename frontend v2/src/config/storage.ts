/**
 * Storage Configuration
 * Configuration pour le stockage local et de session
 */

/**
 * Clés de stockage local
 */
export const STORAGE_KEYS = {
  // Authentification
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  SESSION_ID: 'session_id',
  
  // Préférences utilisateur
  PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  FONT_SIZE: 'font_size',
  
  // Données de l'application
  CONVERSATION_HISTORY: 'conversation_history',
  DRAFT_EMAILS: 'draft_emails',
  RECENT_TEMPLATES: 'recent_templates',
  RECENT_ACTIONS: 'recent_actions',
  FAVORITE_TEMPLATES: 'favorite_templates',
  
  // Cache
  EMAIL_CONTENT_CACHE: 'email_content_cache',
  ATTACHMENT_CACHE: 'attachment_cache',
  USER_CACHE: 'user_cache',
  
  // UI State
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LAST_VISITED_ROUTE: 'last_visited_route',
  PANEL_SIZES: 'panel_sizes',
  
  // Analytics
  ANALYTICS_ID: 'analytics_id',
  LAST_ANALYTICS_SYNC: 'last_analytics_sync',
  
  // Feature Flags
  BETA_FEATURES: 'beta_features',
  FEATURE_FLAGS: 'feature_flags',
  
  // Onboarding
  ONBOARDING_COMPLETED: 'onboarding_completed',
  TOUR_COMPLETED: 'tour_completed',
  TIPS_DISMISSED: 'tips_dismissed'
} as const;

/**
 * Durée de vie des items en cache (en millisecondes)
 */
export const STORAGE_TTL = {
  // Tokens - expiration courte pour la sécurité
  [STORAGE_KEYS.AUTH_TOKEN]: 3600000, // 1 heure
  [STORAGE_KEYS.REFRESH_TOKEN]: 2592000000, // 30 jours
  
  // Historique - expiration moyenne
  [STORAGE_KEYS.CONVERSATION_HISTORY]: 86400000, // 24 heures
  [STORAGE_KEYS.RECENT_ACTIONS]: 604800000, // 7 jours
  
  // Cache - expiration courte
  [STORAGE_KEYS.EMAIL_CONTENT_CACHE]: 300000, // 5 minutes
  [STORAGE_KEYS.ATTACHMENT_CACHE]: 600000, // 10 minutes
  [STORAGE_KEYS.USER_CACHE]: 1800000, // 30 minutes
  
  // Drafts - expiration longue
  [STORAGE_KEYS.DRAFT_EMAILS]: 2592000000, // 30 jours
  
  // Analytics
  [STORAGE_KEYS.LAST_ANALYTICS_SYNC]: 3600000 // 1 heure
} as const;

/**
 * Items qui persistent indéfiniment (pas d'expiration)
 */
export const PERSISTENT_KEYS = [
  STORAGE_KEYS.PREFERENCES,
  STORAGE_KEYS.THEME,
  STORAGE_KEYS.LANGUAGE,
  STORAGE_KEYS.FONT_SIZE,
  STORAGE_KEYS.FAVORITE_TEMPLATES,
  STORAGE_KEYS.ONBOARDING_COMPLETED,
  STORAGE_KEYS.TOUR_COMPLETED,
  STORAGE_KEYS.BETA_FEATURES
] as const;

/**
 * Items sensibles qui doivent être chiffrés
 */
export const SENSITIVE_KEYS = [
  STORAGE_KEYS.AUTH_TOKEN,
  STORAGE_KEYS.REFRESH_TOKEN,
  STORAGE_KEYS.SESSION_ID
] as const;

/**
 * Items stockés dans sessionStorage (au lieu de localStorage)
 */
export const SESSION_ONLY_KEYS = [
  STORAGE_KEYS.SESSION_ID,
  STORAGE_KEYS.LAST_VISITED_ROUTE,
  STORAGE_KEYS.PANEL_SIZES
] as const;

/**
 * Taille maximale par item (en caractères)
 */
export const MAX_STORAGE_SIZE = {
  DEFAULT: 50000, // 50KB de texte
  [STORAGE_KEYS.CONVERSATION_HISTORY]: 100000, // 100KB
  [STORAGE_KEYS.DRAFT_EMAILS]: 200000, // 200KB
  [STORAGE_KEYS.ATTACHMENT_CACHE]: 500000 // 500KB
} as const;

/**
 * Structure pour les items avec expiration
 */
export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  expiry?: number;
}

/**
 * Vérifier si une clé doit être persistante
 */
export function isPersistentKey(key: string): boolean {
  return PERSISTENT_KEYS.includes(key as any);
}

/**
 * Vérifier si une clé est sensible
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key as any);
}

/**
 * Vérifier si une clé doit être dans sessionStorage
 */
export function isSessionOnlyKey(key: string): boolean {
  return SESSION_ONLY_KEYS.includes(key as any);
}

/**
 * Obtenir le TTL pour une clé
 */
export function getTTL(key: string): number | undefined {
  return STORAGE_TTL[key as keyof typeof STORAGE_TTL];
}

/**
 * Obtenir la taille maximale pour une clé
 */
export function getMaxSize(key: string): number {
  return MAX_STORAGE_SIZE[key as keyof typeof MAX_STORAGE_SIZE] || MAX_STORAGE_SIZE.DEFAULT;
}

/**
 * Préfixes pour organiser le storage
 */
export const STORAGE_PREFIXES = {
  APP: 'outlook_ai_',
  CACHE: 'cache_',
  USER: 'user_',
  TEMP: 'temp_'
} as const;

/**
 * Obtenir la clé complète avec préfixe
 */
export function getStorageKey(key: string, prefix: keyof typeof STORAGE_PREFIXES = 'APP'): string {
  return `${STORAGE_PREFIXES[prefix]}${key}`;
}

/**
 * Configuration du nettoyage automatique
 */
export const CLEANUP_CONFIG = {
  enabled: true,
  interval: 3600000, // 1 heure
  onStart: true, // Nettoyer au démarrage
  keys: [
    STORAGE_KEYS.EMAIL_CONTENT_CACHE,
    STORAGE_KEYS.ATTACHMENT_CACHE,
    STORAGE_KEYS.USER_CACHE,
    STORAGE_KEYS.CONVERSATION_HISTORY
  ]
};

/**
 * Configuration de la compression
 */
export const COMPRESSION_CONFIG = {
  enabled: true,
  threshold: 10000, // Compresser si > 10KB
  keys: [
    STORAGE_KEYS.CONVERSATION_HISTORY,
    STORAGE_KEYS.DRAFT_EMAILS,
    STORAGE_KEYS.ATTACHMENT_CACHE
  ]
};

/**
 * Configuration du backup
 */
export const BACKUP_CONFIG = {
  enabled: true,
  interval: 86400000, // 24 heures
  keys: [
    STORAGE_KEYS.PREFERENCES,
    STORAGE_KEYS.FAVORITE_TEMPLATES,
    STORAGE_KEYS.DRAFT_EMAILS
  ]
};

/**
 * Événements de storage
 */
export const STORAGE_EVENTS = {
  ITEM_ADDED: 'storage:item:added',
  ITEM_UPDATED: 'storage:item:updated',
  ITEM_REMOVED: 'storage:item:removed',
  ITEM_EXPIRED: 'storage:item:expired',
  QUOTA_EXCEEDED: 'storage:quota:exceeded',
  CLEANUP_STARTED: 'storage:cleanup:started',
  CLEANUP_COMPLETED: 'storage:cleanup:completed'
} as const;

/**
 * Limites de quota
 */
export const QUOTA_LIMITS = {
  WARNING_THRESHOLD: 0.8, // Avertir à 80% de la capacité
  CRITICAL_THRESHOLD: 0.95, // Critique à 95%
  ESTIMATED_TOTAL: 5242880 // 5MB estimé pour localStorage
} as const;

/**
 * Type pour les clés de stockage
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
