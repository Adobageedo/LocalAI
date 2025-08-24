/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

// Base API URL - can be overridden by environment variable
export const API_BASE_URL = 'https://chardouin.fr/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication endpoints
  USERS: `${API_BASE_URL}/users`,
  
  // Outlook endpoints
  OUTLOOK_PROMPT: `${API_BASE_URL}/outlook/prompt`,
  OUTLOOK_SUMMARIZE: `${API_BASE_URL}/outlook/summarize`,
  
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
