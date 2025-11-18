// Services - Barrel Exports

// API Service Layer
export * from './api';
export * from './logger';
// Legacy Services (kept for backward compatibility)
// Avoid re-exporting types that conflict with ./api (ComposeRequest, ComposeResponse, StreamChunk)
export {
  generateEmail,
  correctEmail,
  reformulateEmail,
  getCurrentEmailContent,
  processEscapeSequences,
  insertContentIntoOutlook,
  getUserEmailFromOutlook,
  getOutlookLanguage,
  generateEmailStream,
  correctEmailStream,
  reformulateEmailStream,
  generateOutlookTemplateStream,
  summarizeFileStream,
} from './composeService';
export * from './userPreferencesService';
