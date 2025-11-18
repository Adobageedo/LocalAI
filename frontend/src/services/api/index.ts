// API Service Layer - Barrel Exports
export * from './baseService';
export * from './emailService';
export * from './userService';
export * from './authService';
export * from './llmService';
export * from './composeApiService';
export * from './techniciansService';
export * from './recordsService';

// Export service instances for convenience
export { emailService } from './emailService';
export { userService } from './userService';
export { authService } from './authService';
export { llmService } from './llmService';
export { composeApiService } from './composeApiService';
export { techniciansService } from './techniciansService';
export { recordsService } from './recordsService';
