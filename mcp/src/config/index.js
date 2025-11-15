import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Application configuration
 * Centralized configuration loaded from environment variables
 */
export const config = {
  // RAG API Configuration
  rag: {
    apiUrl: process.env.RAG_API_URL || 'http://localhost:8000',
    apiKey: process.env.RAG_API_KEY || '',
    defaultCollection: 'edoardo',
    defaultTopK: 5,
  },

  // Document Configuration
  documents: {
    baseFolder: process.env.PDP_BASE_FOLDER || './data/pdp',
    templateFolder: process.env.TEMPLATE_FOLDER || './templates',
    defaultTemplate: 'test.docx',
    annualBaseFolder: process.env.PDP_ANNUAL_BASE_FOLDER || './data/pdp_annual',
  },

  // MCP Server Configuration
  server: {
    name: process.env.MCP_SERVER_NAME || 'pdp-document-generator',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/mcp-server.log',
  },
};

/**
 * Validate required configuration
 * @throws {Error} If required configuration is missing
 * @returns {boolean} True if all required config is present
 */
export function validateConfig() {
  const required = [
    { key: 'RAG_API_URL', value: config.rag.apiUrl },
  ];

  const missing = required.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(', ');
    throw new Error(`Missing required configuration: ${missingKeys}`);
  }

  return true;
}

export default config;
