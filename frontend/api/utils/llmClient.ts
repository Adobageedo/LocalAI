/**
 * LLM API Client
 * 
 * Handles communication with external LLM API
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  systemPrompt?: string;  // Optional, can use messages instead
  userPrompt?: string;    // Optional, can use messages instead
  messages?: ChatMessage[]; // For conversation history
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
}

export interface LLMResponse {
  answer: string;
  model?: string;
  temperature?: number;
  tokensUsed?: number;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  model?: string;
  tokensUsed?: number;
}

export class LLMClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  /**
   * Call external LLM API
   */
  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      // For OpenAI-compatible APIs
      console.log('LLM Model:', process.env.LLM_MODEL);
      
      // Build messages array - use provided messages or construct from prompts
      const messages: ChatMessage[] = request.messages || [
        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
        ...(request.userPrompt ? [{ role: 'user' as const, content: request.userPrompt }] : [])
      ];
      
      console.log(`📨 Sending ${messages.length} messages to LLM`);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: request.model || process.env.LLM_MODEL || 'gpt-5-mini',
          messages,
          temperature: request.temperature ?? 0.7,
          max_completion_tokens: request.maxTokens ?? 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
        usage?: { total_tokens?: number };
      };

      const answer = data.choices?.[0]?.message?.content || '';
      console.log('✅ LLM Response received, length:', answer.length);
      
      return {
        answer,
        model: data.model,
        temperature: request.temperature,
        tokensUsed: data.usage?.total_tokens
      };
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream LLM response chunk by chunk
   * Returns an async generator that yields text chunks as they arrive
   */
  async *generateStream(request: LLMRequest): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      console.log('🌊 Starting stream for LLM Model:', process.env.LLM_MODEL);
      
      // Build messages array - use provided messages or construct from prompts
      const messages: ChatMessage[] = request.messages || [
        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
        ...(request.userPrompt ? [{ role: 'user' as const, content: request.userPrompt }] : [])
      ];
      
      console.log(`📨 Streaming ${messages.length} messages to LLM`);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: request.model || process.env.LLM_MODEL || 'gpt-4o-mini',
          messages,
          temperature: request.temperature ?? 0.7,
          max_completion_tokens: request.maxTokens ?? 500,
          stream: true // Enable streaming
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let totalTokens = 0;
      let modelName = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream complete');
          yield {
            delta: '',
            done: true,
            model: modelName,
            tokensUsed: totalTokens
          };
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6); // Remove 'data: ' prefix
              const data = JSON.parse(jsonStr) as {
                choices?: Array<{
                  delta?: { content?: string };
                  finish_reason?: string | null;
                }>;
                model?: string;
                usage?: { total_tokens?: number };
              };

              // Extract model name
              if (data.model && !modelName) {
                modelName = data.model;
              }

              // Extract usage if available
              if (data.usage?.total_tokens) {
                totalTokens = data.usage.total_tokens;
              }

              // Extract content delta
              const delta = data.choices?.[0]?.delta?.content || '';
              const finishReason = data.choices?.[0]?.finish_reason;

              if (delta) {
                yield {
                  delta,
                  done: false,
                  model: modelName
                };
              }

              // Check if stream is done
              if (finishReason) {
                console.log('🏁 Stream finished:', finishReason);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError, 'Line:', trimmed);
            }
          }
        }
      }
    } catch (error) {
      console.error('LLM stream failed:', error);
      throw new Error(`Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

const llmClient = new LLMClient();
export default llmClient;
