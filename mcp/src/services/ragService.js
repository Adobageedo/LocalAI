import fetch from 'node-fetch';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

/**
 * Service for interacting with RAG API
 */
class RAGService {
  constructor() {
    this.apiUrl = config.rag.apiUrl;
    this.apiKey = config.rag.apiKey;
  }

  /**
   * Fetch contextual information from RAG API
   * @param {Object} params - Query parameters
   * @param {string} params.query - Search query
   * @param {string} [params.collection] - Collection name
   * @param {number} [params.topK] - Number of results to return
   * @param {boolean} [params.splitPrompt] - Whether to split the prompt
   * @param {boolean} [params.rerank] - Whether to rerank results
   * @param {boolean} [params.useHyde] - Whether to use HyDE
   * @returns {Promise<Object>} RAG response with context and documents
   */
  async fetchContext(params) {
    const {
      query,
      collection = config.rag.defaultCollection,
      topK = config.rag.defaultTopK,
      splitPrompt = true,
      rerank = false,
      useHyde = false,
    } = params;

    if (!query || query.trim() === '') {
      throw new Error('Query parameter is required');
    }

    const endpoint = `${this.apiUrl}/api/rag/search`;
    
    logger.info('Fetching context from RAG API', {
      endpoint,
      query: query.substring(0, 100),
      collection,
      topK,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'x-api-key': this.apiKey }),
        },
        body: JSON.stringify({
          query,
          collection,
          top_k: topK,
          split_prompt: splitPrompt,
          rerank,
          use_hyde: useHyde,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `RAG API request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      logger.info('Successfully fetched context from RAG API', {
        documentsCount: data.documents?.length || 0,
        hasContext: !!data.context,
      });

      return {
        success: true,
        context: data.context || '',
        documents: data.documents || [],
        metadata: {
          query,
          collection,
          topK,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Error fetching context from RAG API', {
        error: error.message,
        stack: error.stack,
        endpoint,
      });

      throw new Error(`Failed to fetch RAG context: ${error.message}`);
    }
  }

  /**
   * Fetch context for PDP generation
   * @param {string} windfarmName - Name of the windfarm
   * @param {string} pdpId - PDP identifier
   * @param {Object} additionalContext - Additional context information
   * @returns {Promise<Object>} RAG response with relevant context
   */
  async fetchPDPContext(windfarmName, pdpId, additionalContext = {}) {
    const query = this._buildPDPQuery(windfarmName, pdpId, additionalContext);

    return this.fetchContext({
      query,
      collection: config.rag.defaultCollection,
      topK: 5,
      splitPrompt: true,
      rerank: false,
      useHyde: false,
    });
  }

  /**
   * Build optimized query for PDP context
   * @private
   */
  _buildPDPQuery(windfarmName, pdpId, additionalContext) {
    const parts = [
      `PDP ${pdpId}`,
      `Windfarm: ${windfarmName}`,
    ];

    if (additionalContext.turbineType) {
      parts.push(`Turbine type: ${additionalContext.turbineType}`);
    }

    if (additionalContext.maintenanceType) {
      parts.push(`Maintenance: ${additionalContext.maintenanceType}`);
    }

    if (additionalContext.specificIssues) {
      parts.push(`Issues: ${additionalContext.specificIssues}`);
    }

    return parts.join('. ');
  }

  /**
   * Health check for RAG API
   * @returns {Promise<boolean>} True if API is accessible
   */
  async healthCheck() {
    try {
      const endpoint = `${this.apiUrl}/health`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          ...(this.apiKey && { 'x-api-key': this.apiKey }),
        },
      });

      return response.ok;
    } catch (error) {
      logger.warn('RAG API health check failed', {
        error: error.message,
      });
      return false;
    }
  }
}

export default new RAGService();
