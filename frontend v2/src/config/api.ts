/**
 * API Configuration
 * Configuration centralisée pour tous les endpoints API et paramètres de communication
 */

// Base URL de l'API - peut être surchargée par variable d'environnement
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:8000/api';

/**
 * Endpoints API organisés par domaine fonctionnel
 */
export const API_ENDPOINTS = {
  // Authentification
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },

  // Utilisateurs
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    PREFERENCES: '/users/preferences',
    UPDATE: '/users/update'
  },

  // Outlook - Email Compose
  COMPOSE: {
    GENERATE: '/outlook/compose/generate',
    GENERATE_STREAM: '/outlook/compose/generate/stream',
    CORRECT: '/outlook/compose/correct',
    CORRECT_STREAM: '/outlook/compose/correct/stream',
    REFORMULATE: '/outlook/compose/reformulate',
    REFORMULATE_STREAM: '/outlook/compose/reformulate/stream'
  },

  // Outlook - Email Read
  READ: {
    SUMMARIZE: '/outlook/summarize',
    SUMMARIZE_STREAM: '/outlook/summarize/stream',
    ANALYZE: '/outlook/analyze',
    EXTRACT_INFO: '/outlook/extract-info'
  },

  // Templates
  TEMPLATES: {
    BASE: '/outlook/template',
    GENERATE: '/outlook/template/generate',
    GENERATE_STREAM: '/outlook/template/generate/stream',
    LIST: '/outlook/template/list',
    GET: '/outlook/template/:id',
    CREATE: '/outlook/template/create',
    UPDATE: '/outlook/template/:id/update',
    DELETE: '/outlook/template/:id/delete',
    CATEGORIES: '/outlook/template/categories'
  },

  // Chat / LLM
  CHAT: {
    PROMPT: '/outlook/prompt',
    PROMPT_STREAM: '/outlook/prompt/stream',
    CONVERSATION: '/chat/conversation',
    HISTORY: '/chat/history'
  },

  // Attachments
  ATTACHMENTS: {
    UPLOAD: '/attachments/upload',
    DOWNLOAD: '/attachments/:id/download',
    DELETE: '/attachments/:id/delete',
    ANALYZE: '/attachments/analyze'
  },

  // Style Analysis
  STYLE: {
    ANALYZE: '/style/analyze',
    PROFILE: '/style/profile',
    UPDATE: '/style/update'
  },

  // Analytics
  ANALYTICS: {
    TRACK: '/analytics/track',
    EVENTS: '/analytics/events'
  }
};

/**
 * Configuration générale de l'API
 */
export const API_CONFIG = {
  // Timeout par défaut (30 secondes)
  timeout: 30000,
  
  // Headers communs à toutes les requêtes
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Configuration du retry
  retry: {
    maxRetries: 3,
    retryDelay: 1000, // ms
    retryOn: [408, 429, 500, 502, 503, 504]
  },
  
  // Configuration du cache
  cache: {
    enabled: true,
    ttl: 300000 // 5 minutes en ms
  }
};

/**
 * Helper pour construire des URLs avec paramètres
 */
export const buildApiUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  let url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    // Remplacer les paramètres dans l'URL (ex: /users/:id)
    Object.keys(params).forEach(key => {
      url = url.replace(`:${key}`, String(params[key]));
    });
  }
  
  return url;
};

/**
 * Helper pour construire des query strings
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Configuration des endpoints de streaming
 */
export const STREAM_ENDPOINTS = [
  API_ENDPOINTS.COMPOSE.GENERATE_STREAM,
  API_ENDPOINTS.COMPOSE.CORRECT_STREAM,
  API_ENDPOINTS.COMPOSE.REFORMULATE_STREAM,
  API_ENDPOINTS.READ.SUMMARIZE_STREAM,
  API_ENDPOINTS.TEMPLATES.GENERATE_STREAM,
  API_ENDPOINTS.CHAT.PROMPT_STREAM
];

/**
 * Vérifier si un endpoint est un endpoint de streaming
 */
export const isStreamEndpoint = (endpoint: string): boolean => {
  return STREAM_ENDPOINTS.some(streamEndpoint => endpoint.includes(streamEndpoint));
};

/**
 * Configuration par environnement
 */
export const ENV_CONFIG = {
  development: {
    apiUrl: 'http://localhost:8000/api',
    enableDebug: true,
    enableMocks: false
  },
  staging: {
    apiUrl: 'https://staging-api.example.com/api',
    enableDebug: true,
    enableMocks: false
  },
  production: {
    apiUrl: 'https://api.example.com/api',
    enableDebug: false,
    enableMocks: false
  }
};

/**
 * Obtenir la configuration pour l'environnement actuel
 */
export const getCurrentEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env as keyof typeof ENV_CONFIG] || ENV_CONFIG.development;
};
