import { createToolDefinition } from '../lib/mcpHelpers.js';
import { generatePdpDocumentSchema } from '../schemas/pdpSchema.js';
import { ToolExecutionError } from '../lib/errors.js';
import documentGeneratorService from '../services/documentGeneratorService.js';
import logger from '../utils/logger.js';

/**
 * Tool: generate_pdp_document
 * Generate a PDP document from template with provided data
 */

// ==================== TOOL DEFINITION ====================

export const toolDefinition = createToolDefinition(
  'generate_pdp_document',
  'Generate a PDP document from a template with provided data. Supports both flat format and company/workers structured format. Automatically transforms data, cleans empty rows, and saves with timestamps.',
  generatePdpDocumentSchema
);

// ==================== TOOL HANDLER ====================

/**
 * Handler for generate_pdp_document tool
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Generation result
 */
export async function handler(args) {
  const {
    pdpId,
    windfarmName,
    data,
    templateName,
    surname,
    mergeWithPDP = true,
    saveToFile = true,
  } = args;

  try {
    logger.debug('Generating PDP document', {
      pdpId,
      windfarmName,
      templateName,
      surname,
      mergeWithPDP,
      saveToFile,
    });
    if (!surname && templateName) {
      surname = templateName.replace(/\.docx$/i, "");
    }
    // Validate required parameters
    if (!pdpId || !windfarmName || !data) {
      throw new ToolExecutionError(
        'generate_pdp_document',
        'Missing required parameters: pdpId, windfarmName, and data are required'
      );
    }

    // Call document generator service
    const result = await documentGeneratorService.generatePDP({
      pdpId,
      windfarmName,
      data,
      surname,
      mergeWithPDP,
      templateName,
      saveToFile,
    });

    logger.debug('PDP document generated successfully', {
      pdpId,
      filePath: result.filePath,
      size: result.size,
    });

    return result;
  } catch (error) {
    logger.error('Error generating PDP document', {
      error: error.message,
      stack: error.stack,
      pdpId,
      windfarmName,
    });

    throw new ToolExecutionError(
      'generate_pdp_document',
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
