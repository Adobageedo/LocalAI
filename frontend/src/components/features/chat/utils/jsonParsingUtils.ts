/**
 * Utilities for parsing JSON responses from LLM
 */

import { SuggestedButton } from '../types';

interface ParsedResponse {
  content: string;
  buttons?: SuggestedButton[];
}

/**
 * Extract response text from streaming JSON
 * Handles partial JSON during streaming
 */
export function extractStreamingResponse(accumulatedText: string): string {
  let displayText = accumulatedText;

  try {
    // Check if we're accumulating JSON
    if (accumulatedText.trim().startsWith('{')) {
      // Try to extract content between "response": " and ", "buttons"
      const responseMatch = accumulatedText.match(/"response"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
      
      if (responseMatch && responseMatch[1]) {
        // Decode escaped characters: \n, \", \\, etc.
        displayText = unescapeJsonString(responseMatch[1]);
      } else {
        // If we can't extract complete response yet, check if we're still building it
        const partialMatch = accumulatedText.match(/"response"\s*:\s*"((?:[^"\\]|\\[\s\S])*)$/);
        if (partialMatch && partialMatch[1]) {
          displayText = unescapeJsonString(partialMatch[1]);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to extract response during streaming:', e);
  }

  return displayText;
}

/**
 * Parse final JSON response
 */
export function parseFinalResponse(accumulatedText: string): ParsedResponse {
  try {
    const jsonResponse = JSON.parse(accumulatedText);
    
    if (jsonResponse.response) {
      return {
        content: jsonResponse.response,
        buttons: jsonResponse.buttons || undefined
      };
    }
  } catch (e) {
    console.log('Response is not JSON, using as plain text');
  }

  return { content: accumulatedText };
}

/**
 * Unescape JSON string
 */
function unescapeJsonString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
