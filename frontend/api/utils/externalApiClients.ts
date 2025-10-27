/**
 * External API Clients
 * 
 * Handles communication with external services for:
 * - User writing style analysis
 * - RAG (Retrieval-Augmented Generation) information
 */

export interface StyleAnalysisResponse {
  styleContext: string;
  hasStyle: boolean;
}

export interface RAGResponse {
  sources: Array<{
    content: string;
    source: string;
    relevance?: number;
  }>;
  hasResults: boolean;
}

/**
 * Style Analysis API Client
 * Fetches user's writing style profile for personalization
 */
export class StyleAnalysisClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.STYLE_ANALYSIS_API_URL || '';
    this.apiKey = process.env.STYLE_ANALYSIS_API_KEY || '';
  }

  async getUserStyle(userId: string): Promise<StyleAnalysisResponse> {
    try {
      // If API not configured, return empty response
      if (!this.apiUrl) {
        console.log('Style analysis API not configured');
        return {
          styleContext: '',
          hasStyle: false
        };
      }

      const response = await fetch(`${this.apiUrl}/users/${userId}/style`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        console.error(`Style analysis API error: ${response.status}`);
        return {
          styleContext: '',
          hasStyle: false
        };
      }

      const data = await response.json() as {
        styleContext?: string;
        style_context?: string;
      };

      return {
        styleContext: data.styleContext || data.style_context || '',
        hasStyle: true
      };
    } catch (error) {
      console.error('Style analysis fetch failed:', error);
      return {
        styleContext: '',
        hasStyle: false
      };
    }
  }
}

/**
 * RAG API Client
 * Fetches relevant information from knowledge base
 */
export class RAGClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.RAG_API_URL || '';
    this.apiKey = process.env.RAG_API_KEY || '';
  }

  async getRelevantInfo(query: string, userId: string): Promise<RAGResponse> {
    try {
      // If API not configured, return empty response
      if (!this.apiUrl) {
        console.log('RAG API not configured');
        return {
          sources: [],
          hasResults: false
        };
      }

      const response = await fetch(`${this.apiUrl}/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          userId,
          topK: 3
        })
      });

      if (!response.ok) {
        console.error(`RAG API error: ${response.status}`);
        return {
          sources: [],
          hasResults: false
        };
      }

      const data = await response.json() as {
        sources?: Array<{
          content: string;
          source: string;
          relevance?: number;
        }>;
      };

      return {
        sources: data.sources || [],
        hasResults: (data.sources || []).length > 0
      };
    } catch (error) {
      console.error('RAG fetch failed:', error);
      return {
        sources: [],
        hasResults: false
      };
    }
  }
}

export const styleAnalysisClient = new StyleAnalysisClient();
export const ragClient = new RAGClient();
