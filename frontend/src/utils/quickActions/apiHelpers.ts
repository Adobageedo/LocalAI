/**
 * Shared API helpers for QuickActions
 * Centralized API call functions to avoid duplication
 */

import { llmService, ChatMessage } from '../../services/api';
import { LLM_CONFIG } from '../../config/constants';

export interface LLMRequestParams {
  prompt?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  rag?: boolean;
  ragCollection?: string;
  model?: string;
  useMcpTools?: boolean;
}

export interface LLMStreamResponse {
  content: string;
  done: boolean;
  toolCalls?: any[];
}

/**
 * Call LLM API with streaming support
 * Now uses the centralized llmService
 */
export async function callLLMWithStreaming(
  params: LLMRequestParams,
  onChunk: (chunk: LLMStreamResponse) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const request = {
      model: params.model || LLM_CONFIG.DEFAULT_MODEL,
      temperature: params.temperature || LLM_CONFIG.DEFAULT_TEMPERATURE,
      maxTokens: params.maxTokens || LLM_CONFIG.DEFAULT_MAX_TOKENS,
      ...params,
    };

    for await (const chunk of llmService.streamPrompt(request)) {
      if (chunk.type === 'error') {
        throw new Error(chunk.error || 'Stream error');
      }

      if (chunk.type === 'chunk' && chunk.delta) {
        onChunk({
          content: chunk.delta,
          done: false,
        });
      }

      if (chunk.type === 'done') {
        onChunk({
          content: '',
          done: true,
        });
        return;
      }
    }
  } catch (error) {
    onError(error as Error);
  }
}

/**
 * Download PDP file from API
 */
export async function downloadPDPFile(): Promise<void> {
  try {
    const response = await fetch('/api/download-pdp', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDP: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
    const filename = filenameMatch ? filenameMatch[1] : 'PDP_document.pdf';
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading PDP file:', error);
    throw error;
  }
}

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJSONFromResponse(response: string): any {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  
  // Remove ```json and ``` markers
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  
  // Try to find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('Invalid JSON in response');
    }
  }
  
  throw new Error('No JSON found in response');
}
