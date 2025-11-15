/**
 * Application constants
 * Centralized constants used across the application
 */

// Resource URIs
export const RESOURCE_URIS = {
  SERVER_CONFIG: 'config://server',
  RAG_STATUS: 'status://rag',
};

// MCP Tool Names
export const TOOL_NAMES = {
  GENERATE_PDP: 'generate_pdp_document',
  FETCH_RAG: 'fetch_rag_context',
  GENERATE_PDP_WITH_RAG: 'generate_pdp_with_rag',
  LIST_TEMPLATES: 'list_templates',
  SAVE_NOTE: 'save_note',
};

// Note Types
export const NOTE_TYPES = {
  OM: 'O&M',
  OPERATIONAL: 'operational',
  INVOICE: 'invoice',
  CONTRACT: 'contract',
  MEETING: 'meeting',
  INCIDENT: 'incident',
  MAINTENANCE: 'maintenance',
  OTHER: 'other',
};

// Date Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
  FILENAME: 'YYYY-MM-DD-HHmmss',
};

// File Constraints
export const FILE_CONSTRAINTS = {
  MAX_TECHNICIANS: 10,
  MAX_CERTIFICATIONS_PER_TECH: 20,
};

export default {
  RESOURCE_URIS,
  TOOL_NAMES,
  NOTE_TYPES,
  DATE_FORMATS,
  FILE_CONSTRAINTS,
};
