// Barrel export for all configuration
export * from './api.config';
export * from './app.config';
export * from './constants';

// Re-export legacy api.ts for backward compatibility
export { default as legacyApiConfig } from './api';
