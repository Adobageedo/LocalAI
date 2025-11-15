import { createToolDefinition } from '../lib/mcpHelpers.js';
import { generatePdpWithRagSchema } from '../schemas/pdpSchema.js';
import { ToolExecutionError } from '../lib/errors.js';
import documentGeneratorService from '../services/documentGeneratorService.js';
import ragService from '../services/ragService.js';
import logger from '../utils/logger.js';

/**
 * Tool: generate_pdp_with_rag
 * Generate PDP document enriched with RAG context
 */

// ==================== TOOL DEFINITION ====================

export const toolDefinition = createToolDefinition(
  'generate_pdp_with_rag',
  'Generate a PDP document enriched with RAG context. Combines document generation with contextual information retrieval.',
  generatePdpWithRagSchema
);

// ==================== HELPER FUNCTIONS ====================

/**
 * Build RAG query from PDP parameters
 * @param {string} pdpId - PDP identifier
 * @param {string} windfarmName - Windfarm name
 * @param {Object} data - Template data
 * @returns {string} RAG query
 */
function buildRagQuery(pdpId, windfarmName, data) {
  return `PDP ${pdpId} for windfarm ${windfarmName}. ${data.title || ''} ${
    data.description || ''
  }`.trim();
}

/**
 * Enhance data with RAG context
 * @param {Object} data - Original data
 * @param {Object} ragResult - RAG result
 * @returns {Object} Enhanced data
 */
function enhanceDataWithRag(data, ragResult) {
  return {
    ...data,
    ragContext: ragResult.context,
    ragDocuments: ragResult.documents?.map((doc) => ({
      content: doc.content?.substring(0, 500),
      metadata: doc.metadata,
    })),
  };
}

// ==================== TOOL HANDLER ====================

/**
 * Handler for generate_pdp_with_rag tool
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Generation result with RAG enhancement info
 */
export async function handler(args) {
  const {
    pdpId,
    windfarmName,
    data,
    ragQuery,
    templateName,
    surname,
    mergeWithPDP = false,
    enhanceWithRAG = true,
  } = args;

  try {
    logger.info('Generating PDP with RAG context', {
      pdpId,
      windfarmName,
      enhanceWithRAG,
    });

    // Validate required parameters
    if (!pdpId || !windfarmName || !data) {
      throw new ToolExecutionError(
        'generate_pdp_with_rag',
        'Missing required parameters: pdpId, windfarmName, and data are required'
      );
    }

    let enhancedData = { ...data };

    // Fetch and apply RAG context if enabled
    if (enhanceWithRAG) {
      const query = ragQuery || buildRagQuery(pdpId, windfarmName, data);

      logger.info('Fetching RAG context for PDP generation', { query });

      const ragResult = await ragService.fetchContext({ query });
      enhancedData = enhanceDataWithRag(data, ragResult);

      logger.info('RAG context applied to PDP data', {
        documentsCount: ragResult.documents?.length || 0,
      });
    }

    // Generate document with enhanced data
    const result = await documentGeneratorService.generatePDP({
      pdpId,
      windfarmName,
      data: enhancedData,
      surname,
      mergeWithPDP,
      templateName,
      saveToFile: true,
    });

    logger.info('PDP with RAG generated successfully', {
      pdpId,
      ragEnhanced: enhanceWithRAG,
      filePath: result.filePath,
    });

    return {
      ...result,
      ragEnhanced: enhanceWithRAG,
    };
  } catch (error) {
    logger.error('Error generating PDP with RAG', {
      error: error.message,
      stack: error.stack,
      pdpId,
      windfarmName,
    });

    throw new ToolExecutionError(
      'generate_pdp_with_rag',
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
