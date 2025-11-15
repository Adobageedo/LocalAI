import { createToolDefinition } from '../lib/mcpHelpers.js';
import { listTemplatesSchema } from '../schemas/pdpSchema.js';
import { ToolExecutionError } from '../lib/errors.js';
import documentGeneratorService from '../services/documentGeneratorService.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Tool: list_templates
 * List all available document templates
 */

// ==================== TOOL DEFINITION ====================

export const toolDefinition = createToolDefinition(
  'list_templates',
  'List all available document templates',
  listTemplatesSchema
);

// ==================== TOOL HANDLER ====================

/**
 * Handler for list_templates tool
 * @param {Object} args - Tool arguments (empty for this tool)
 * @returns {Promise<Object>} List of templates
 */
export async function handler(args) {
  try {
    logger.info('Listing available templates');

    // Get templates from document generator service
    const templates = await documentGeneratorService.listTemplates();

    logger.info('Templates listed successfully', {
      count: templates.length,
    });

    return {
      success: true,
      templates,
      count: templates.length,
      templateFolder: config.documents.templateFolder,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error listing templates', {
      error: error.message,
      stack: error.stack,
    });

    throw new ToolExecutionError(
      'list_templates',
      error.message,
      error
    );
  }
}

// ==================== EXPORTS ====================

export default {
  toolDefinition,
  handler,
};
