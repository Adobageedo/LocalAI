/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

// Base API URL - can be overridden by environment variable
// HTTPS required for Outlook add-ins
// For Vercel deployment: will be https://your-app.vercel.app/api
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication endpoints
  USERS: `${API_BASE_URL}/users`,
  
  // User management endpoints
  USER_PROFILE: `${API_BASE_URL}/user/profile`,
  USER_PREFERENCES: `${API_BASE_URL}/user/preferences`,
  
  // Outlook endpoints
  OUTLOOK_PROMPT: `${API_BASE_URL}/outlook/prompt`,
  OUTLOOK_SUMMARIZE: `${API_BASE_URL}/outlook/summarize`,
  
  // Compose endpoints (unified endpoint)
  COMPOSE: `${API_BASE_URL}/compose`,
  
  OUTLOOK_AUTH: `${API_BASE_URL}/outlook/auth/login`,
  OUTLOOK_REVOKE_ACCESS: `${API_BASE_URL}/outlook/auth/revoke_access`,
  OUTLOOK_STATUS: `${API_BASE_URL}/outlook/auth/status`,
  
  GMAIL_AUTH: `${API_BASE_URL}/gmail/auth/login`,
  GMAIL_REVOKE_ACCESS: `${API_BASE_URL}/gmail/auth/revoke_access`,
  GMAIL_STATUS: `${API_BASE_URL}/gmail/auth/status`,
  
  // Add more endpoints as needed
} as const;

// API Configuration settings
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  API_CONFIG,
  buildApiUrl,
};
