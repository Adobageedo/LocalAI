import { BaseApiService } from './baseService';
import { API_ENDPOINTS } from '../../config/api';

/**
 * Compose Service Types
 */
export interface ComposeRequest {
  subject?: string;
  body?: string;
  from?: string;
  to?: string;
  additionalInfo?: string;
  tone: string;
  language: string;
  useRag?: boolean;
  userId?: string;
  conversationId?: string;
  operation: 'generate' | 'correct' | 'reformulate';
}

export interface ComposeResponse {
  generated_text: string;
  success: boolean;
  message?: string;
  sources?: any[];
  metadata?: {
    tone: string;
    language: string;
    use_rag: boolean;
    model?: string;
    temperature?: number;
    style_analysis_used: boolean;
    tokens_used?: number;
  };
}

export interface ComposeStreamChunk {
  type: 'chunk' | 'done' | 'error';
  chunkNumber?: number;
  delta?: string;
  done?: boolean;
  fullText?: string;
  error?: string;
  message?: string;
  metadata?: ComposeResponse['metadata'];
}

/**
 * Compose API Service
 * Handles email composition with LLM (generate, correct, reformulate)
 */
export class ComposeApiService extends BaseApiService {
  /**
   * Non-streaming compose request
   * Returns complete response immediately
   */
  async compose(request: ComposeRequest): Promise<{ data?: ComposeResponse; success: boolean; error?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.COMPOSE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Compose request failed',
        };
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Streaming compose request
   * Returns an async generator that yields SSE chunks
   */
  async *composeStream(request: ComposeRequest): AsyncGenerator<ComposeStreamChunk, void, unknown> {
    try {
      const response = await fetch(`${API_ENDPOINTS.COMPOSE}-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        yield {
          type: 'error',
          error: errorData.error || errorData.message || `HTTP ${response.status}`,
        };
        return;
      }

      if (!response.body) {
        yield {
          type: 'error',
          error: 'No response body',
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: ComposeStreamChunk = JSON.parse(line.slice(6));
              yield chunk;
              
              if (chunk.type === 'done' || chunk.type === 'error') {
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stream compose and collect full text
   * Convenience method for streaming that returns final result
   */
  async composeStreamCollect(request: ComposeRequest): Promise<{ text: string; success: boolean; error?: string; metadata?: any }> {
    try {
      let fullText = '';
      const metadata: any = undefined;
      
      for await (const chunk of this.composeStream(request)) {
        if (chunk.type === 'error') {
          return {
            text: '',
            success: false,
            error: chunk.error || 'Stream error',
          };
        }
        
        if (chunk.type === 'chunk' && chunk.delta) {
          fullText += chunk.delta;
        }
        
        if (chunk.type === 'done') {
          return {
            text: chunk.fullText || fullText,
            success: true,
            metadata: chunk.metadata,
          };
        }
      }
      
      return {
        text: fullText,
        success: true,
        metadata,
      };
    } catch (error) {
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convenience methods for specific operations
   */
  async generate(request: Omit<ComposeRequest, 'operation'>): Promise<ReturnType<typeof this.compose>> {
    return this.compose({ ...request, operation: 'generate' });
  }

  async correct(request: Omit<ComposeRequest, 'operation'>): Promise<ReturnType<typeof this.compose>> {
    return this.compose({ ...request, operation: 'correct' });
  }

  async reformulate(request: Omit<ComposeRequest, 'operation'>): Promise<ReturnType<typeof this.compose>> {
    return this.compose({ ...request, operation: 'reformulate' });
  }

  /**
   * Streaming convenience methods
   */
  generateStream(request: Omit<ComposeRequest, 'operation'>): AsyncGenerator<ComposeStreamChunk, void, unknown> {
    return this.composeStream({ ...request, operation: 'generate' });
  }

  correctStream(request: Omit<ComposeRequest, 'operation'>): AsyncGenerator<ComposeStreamChunk, void, unknown> {
    return this.composeStream({ ...request, operation: 'correct' });
  }

  reformulateStream(request: Omit<ComposeRequest, 'operation'>): AsyncGenerator<ComposeStreamChunk, void, unknown> {
    return this.composeStream({ ...request, operation: 'reformulate' });
  }
}

// Export singleton instance
export const composeApiService = new ComposeApiService();
