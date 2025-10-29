/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

// Base API URL - uses environment variable or defaults to relative path for proxy
// When using relative path (/api), Create React App's proxy will forward to the configured backend
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  OUTLOOK_AUTH_LOGIN: '/auth/login',
  OUTLOOK_AUTH_STATUS: '/auth/status',
  OUTLOOK_AUTH_REVOKE: '/auth/revoke_access',
  GMAIL_AUTH_LOGIN: '/gmail/auth/login',
  GMAIL_AUTH_STATUS: '/gmail/auth/status',
  GMAIL_AUTH_REVOKE: '/gmail/auth/revoke_access',
  
  // User Management
  USERS: '/users',
  USER_PROFILE: '/user/profile',
  USER_PREFERENCES: '/user/preferences',
  
  // Email Operations
  OUTLOOK_GENERATE: '/outlook/generate',
  OUTLOOK_CORRECT: '/outlook/correct',
  OUTLOOK_REFORMULATE: '/outlook/reformulate',
  OUTLOOK_TEMPLATE: '/outlook/prompt',
  OUTLOOK_SUMMARIZE: '/outlook/summarize',
  
  // Legacy endpoints (for backward compatibility)
  COMPOSE: '/compose',
  PROMPT_LLM: '/promptLLM',
  
  // Health Check
  HEALTH: '/health',
} as const;

// API Configuration
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// Helper to get endpoint with base URL
export const getFullEndpoint = (endpoint: keyof typeof API_ENDPOINTS): string => {
  return buildApiUrl(API_ENDPOINTS[endpoint]);
};
