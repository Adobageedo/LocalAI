import { BaseApiService } from './baseService';
import { API_ENDPOINTS } from '../../config/api';

/**
 * LLM Service Types
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface PromptLLMRequest {
  prompt?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  rag?: boolean;
  ragCollection?: string;
  topK?: number;
  model?: string;
  useMcpTools?: boolean;
}

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error';
  chunkNumber?: number;
  delta?: string;
  done?: boolean;
  fullText?: string;
  error?: string;
  message?: string;
}

/**
 * LLM API Service
 * Handles LLM interactions with streaming support
 */
export class LLMService extends BaseApiService {
  /**
   * Send prompt to LLM with streaming response
   * Returns an async generator that yields SSE chunks
   */
  async *streamPrompt(request: PromptLLMRequest): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const response = await fetch(API_ENDPOINTS.PROMPT_LLM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
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
              const chunk: StreamChunk = JSON.parse(line.slice(6));
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
   * Send prompt and collect full response (non-streaming)
   * Useful when you don't need real-time updates
   */
  async sendPrompt(request: PromptLLMRequest): Promise<{ text: string; success: boolean; error?: string }> {
    try {
      let fullText = '';
      
      for await (const chunk of this.streamPrompt(request)) {
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
          };
        }
      }
      
      return {
        text: fullText,
        success: true,
      };
    } catch (error) {
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();
