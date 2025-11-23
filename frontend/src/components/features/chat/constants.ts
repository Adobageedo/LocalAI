/**
 * Constants for chat functionality
 */

// Allowed file extensions for attachment processing
export const ALLOWED_EXTENSIONS = [
  // Documents
  '.doc', '.docx', '.txt', '.rtf', '.odt',
  // Presentations
  '.ppt', '.pptx', '.odp',
  // Spreadsheets
  '.xls', '.xlsx', '.csv', '.ods', '.numbers',
  // PDFs
  '.pdf',
  // Text files
  '.md', '.json', '.xml'
] as const;

// Chat configuration
export const CHAT_CONFIG = {
  MAX_TOKENS: 800,
  TEMPERATURE: 0.7,
  DEFAULT_MODEL: 'gpt-4.1-nano-2025-04-14',
  FINE_TUNED_MODEL: 'ft:gpt-4.1-nano-2025-04-14:personal::CZcTZYzO',
  DEFAULT_GREETING: 'Bonjour, comment puis-je vous aider ?',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  getChatKey: (conversationId: string) => `chat_${conversationId}`,
} as const;
