import { createToolDefinition } from '../lib/mcpHelpers.js';
import { fetchRagContextSchema } from '../schemas/ragSchema.js';
import { ToolExecutionError } from '../lib/errors.js';
import ragService from '../services/ragService.js';
import logger from '../utils/logger.js';

/**
 * Tool: fetch_rag_context
 * Fetch contextual information from RAG API
 */

// ==================== TOOL DEFINITION ====================

export const toolDefinition = createToolDefinition(
  'fetch_rag_context',
  'Fetch contextual information from RAG API to enrich document generation. Supports custom queries, collections, and filtering.',
  fetchRagContextSchema
);

// ==================== TOOL HANDLER ====================

/**
 * Handler for fetch_rag_context tool
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} RAG context result
 */
export async function handler(args) {
  try {
    logger.info('Fetching RAG context', {
      query: args.query?.substring(0, 100),
      collection: args.collection,
      topK: args.topK,
    });

    // Validate query parameter
    if (!args.query || args.query.trim() === '') {
      throw new ToolExecutionError(
        'fetch_rag_context',
        'Query parameter is required and cannot be empty'
      );
    }

    // Call RAG service
    const result = await ragService.fetchContext(args);

    logger.info('RAG context fetched successfully', {
      documentsCount: result.documents?.length || 0,
      hasContext: !!result.context,
    });

    return result;
  } catch (error) {
    logger.error('Error fetching RAG context', {
      error: error.message,
      stack: error.stack,
      query: args.query,
    });

    throw new ToolExecutionError(
      'fetch_rag_context',
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
