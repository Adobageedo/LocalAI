import config from '../config/index.js';

/**
 * JSON schemas for RAG operations
 */

export const fetchRagContextSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query for context retrieval',
    },
    collection: {
      type: 'string',
      description: `Collection name (default: ${config.rag.defaultCollection})`,
    },
    topK: {
      type: 'number',
      description: `Number of results to return (default: ${config.rag.defaultTopK})`,
    },
    splitPrompt: {
      type: 'boolean',
      description: 'Whether to split the prompt (default: true)',
    },
    rerank: {
      type: 'boolean',
      description: 'Whether to rerank results (default: false)',
    },
    useHyde: {
      type: 'boolean',
      description: 'Whether to use HyDE (default: false)',
    },
  },
  required: ['query'],
};

export default {
  fetchRagContextSchema,
};
