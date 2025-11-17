/**
 * Environment Configuration
 * Centralized access to environment variables with validation
 * @module config/env
 */

interface EnvironmentConfig {
  // Firebase
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  // API
  api: {
    baseUrl: string;
    timeout: number;
  };
  // Feature Flags
  features: {
    enableAnalytics: boolean;
    enableDebug: boolean;
  };
  // LLM
  llm: {
    defaultModel: string;
    defaultTemperature: number;
    defaultMaxTokens: number;
  };
  // Environment
  environment: 'development' | 'production' | 'test';
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  const value = process.env[key];
  if (value === undefined && fallback === '') {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value || fallback;
}

/**
 * Get boolean environment variable
 */
function getBoolEnvVar(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
function getNumberEnvVar(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Environment configuration object
 */
const env: EnvironmentConfig = {
  firebase: {
    apiKey: getEnvVar('REACT_APP_FIREBASE_API_KEY'),
    authDomain: getEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('REACT_APP_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('REACT_APP_FIREBASE_APP_ID'),
  },
  api: {
    baseUrl: getEnvVar('REACT_APP_API_BASE_URL', 'http://localhost:3000'),
    timeout: getNumberEnvVar('REACT_APP_API_TIMEOUT', 30000),
  },
  features: {
    enableAnalytics: getBoolEnvVar('REACT_APP_ENABLE_ANALYTICS', false),
    enableDebug: getBoolEnvVar('REACT_APP_ENABLE_DEBUG', process.env.NODE_ENV === 'development'),
  },
  llm: {
    defaultModel: getEnvVar('REACT_APP_DEFAULT_LLM_MODEL', 'gpt-4o-mini'),
    defaultTemperature: parseFloat(getEnvVar('REACT_APP_DEFAULT_LLM_TEMPERATURE', '0.7')),
    defaultMaxTokens: getNumberEnvVar('REACT_APP_DEFAULT_LLM_MAX_TOKENS', 500),
  },
  environment: (getEnvVar('REACT_APP_ENVIRONMENT', process.env.NODE_ENV || 'development')) as any,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

/**
 * Validate required environment variables
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Firebase config (only in production)
  if (env.isProduction) {
    if (!env.firebase.apiKey) errors.push('REACT_APP_FIREBASE_API_KEY is required in production');
    if (!env.firebase.authDomain) errors.push('REACT_APP_FIREBASE_AUTH_DOMAIN is required in production');
    if (!env.firebase.projectId) errors.push('REACT_APP_FIREBASE_PROJECT_ID is required in production');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Log environment configuration (safe for production)
 */
export function logEnvironmentInfo(): void {
  if (!env.features.enableDebug) return;

  console.group('🔧 Environment Configuration');
  console.log('Environment:', env.environment);
  console.log('API Base URL:', env.api.baseUrl);
  console.log('Firebase Project:', env.firebase.projectId || 'Not configured');
  console.log('Analytics Enabled:', env.features.enableAnalytics);
  console.log('Debug Enabled:', env.features.enableDebug);
  console.groupEnd();
}

export default env;
