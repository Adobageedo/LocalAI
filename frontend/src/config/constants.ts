// API Constants
export const API_TIMEOUT = 30000; // 30 seconds

// Email Constants
export const MAX_EMAIL_LENGTH = 10000;
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB

// UI Constants
export const DEBOUNCE_DELAY = 300;
export const DEFAULT_PAGE_SIZE = 20;

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  AUTH_TOKEN: 'auth_token',
  LANGUAGE: 'app_language',
} as const;
