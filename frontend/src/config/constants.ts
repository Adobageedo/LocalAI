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
  CHAT_CONVERSATION: 'chat_', // Prefix for chat conversations
} as const;

// Windfarms Configuration
export const WINDFARMS = [
  { key: 'unknown', text: 'Sélectionner un parc éolien', disabled: true },
  { key: 'parc_alpha', text: 'Parc Alpha' },
  { key: 'parc_beta', text: 'Parc Beta' },
  { key: 'parc_gamma', text: 'Parc Gamma' },
  { key: 'parc_delta', text: 'Parc Delta' },
  { key: 'parc_epsilon', text: 'Parc Epsilon' },
  { key: 'other', text: 'Autre' },
] as const;

// PDP Configuration
export const PDP_CONFIG = {
  DEFAULT_TEMPLATE: 'template.docx',
  ANNUAL_FOLDER: '/Users/edoardo/Documents/LocalAI/mcp/data/annual_PDP',
  MERGE_WITH_ANNUAL: true,
  CERTIFICATION_TYPES: [
    'GWO',
    'H0B0',
    'First Aid',
    'IRATA',
    'Working at Heights',
    'BST',
    'Other',
  ],
} as const;

// Note Types for SavePoint
export const NOTE_TYPES = [
  { key: 'O&M', text: 'O&M - Opération et Maintenance' },
  { key: 'operational', text: 'Opérationnel' },
  { key: 'invoice', text: 'Facturation' },
  { key: 'contract', text: 'Contractuel' },
  { key: 'meeting', text: 'Réunion' },
  { key: 'incident', text: 'Incident' },
  { key: 'maintenance', text: 'Maintenance' },
  { key: 'other', text: 'Autre' },
] as const;

// LLM Configuration
export const LLM_CONFIG = {
  DEFAULT_MODEL: 'gpt-4o-mini',
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 500,
  STREAMING_ENABLED: true,
} as const;
