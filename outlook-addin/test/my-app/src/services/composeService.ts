/**
 * Compose Service
 * Service for email composition operations using the new dedicated compose endpoints
 */

import { authFetch } from '../utils/authFetch.js';
import { API_ENDPOINTS } from '../config/api';

// Types for compose operations
export interface ComposeRequest {
  subject?: string;
  body?: string;
  from?: string;
  to?: string;
  additionalInfo?: string;
  tone?: string;
  language?: string;
  use_rag?: boolean;
  userId?: string;
  conversationId?: string;
}

export interface ComposeResponse {
  generated_text: string;
  success: boolean;
  message?: string;
  sources?: any[];
  metadata?: {
    tone?: string;
    language?: string;
    use_rag?: boolean;
    model?: string;
    temperature?: number;
    operation?: string;
    original_length?: number;
    corrected_length?: number;
    reformulated_length?: number;
    instructions?: string;
  };
}

export interface ComposeError {
  success: false;
  error: string;
  message: string;
  details?: any;
}

/**
 * Validate and normalize language code
 */
function normalizeLanguageCode(language: string): string {
  const supportedCodes = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'zh'];
  
  // If it's already a valid code, return it
  if (supportedCodes.includes(language)) {
    return language;
  }
  
  // Legacy mapping for backward compatibility
  const legacyMap: { [key: string]: string } = {
    'french': 'fr',
    'english': 'en',
    'spanish': 'es',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'dutch': 'nl',
    'russian': 'ru',
    'japanese': 'ja',
    'chinese': 'zh'
  };
  
  return legacyMap[language] || 'fr'; // Default to French
}

/**
 * Generate a new email based on description and parameters
 */
export async function generateEmail(request: ComposeRequest): Promise<ComposeResponse> {
  try {
    // Normalize language code
    const mappedRequest = {
      ...request,
      language: normalizeLanguageCode(request.language || 'fr')
    };
    
    const response = await authFetch(API_ENDPOINTS.COMPOSE_GENERATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mappedRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Generate email failed:', error);
    throw new Error(`Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Correct grammar, spelling, and syntax errors in email text
 */
export async function correctEmail(request: ComposeRequest): Promise<ComposeResponse> {
  try {
    // Normalize language code
    const mappedRequest = {
      ...request,
      language: normalizeLanguageCode(request.language || 'fr')
    };
    
    const response = await authFetch(API_ENDPOINTS.COMPOSE_CORRECT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mappedRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Correct email failed:', error);
    throw new Error(`Erreur lors de la correction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Reformulate email text to improve clarity, style, and tone
 */
export async function reformulateEmail(request: ComposeRequest): Promise<ComposeResponse> {
  try {
    // Normalize language code
    const mappedRequest = {
      ...request,
      language: normalizeLanguageCode(request.language || 'fr')
    };
    
    const response = await authFetch(API_ENDPOINTS.COMPOSE_REFORMULATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mappedRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Reformulate email failed:', error);
    throw new Error(`Erreur lors de la reformulation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Check health of compose service
 */
export async function checkComposeHealth(): Promise<any> {
  try {
    const response = await fetch(API_ENDPOINTS.COMPOSE_HEALTH);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Compose health check failed:', error);
    throw error;
  }
}

/**
 * Utility function to get current email content from Outlook
 */
export function getCurrentEmailContent(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!(window as any).Office?.context?.mailbox?.item) {
      reject(new Error('Outlook context not available'));
      return;
    }

    (window as any).Office.context.mailbox.item.body.getAsync(
      (window as any).Office.CoercionType.Text,
      (result: any) => {
        if (result.status === (window as any).Office.AsyncResultStatus.Succeeded) {
          resolve(result.value || '');
        } else {
          reject(new Error('Failed to get email content from Outlook'));
        }
      }
    );
  });
}

/**
 * Utility function to insert content into Outlook email
 */
export function insertContentIntoOutlook(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!(window as any).Office?.context?.mailbox?.item) {
      reject(new Error('Outlook context not available'));
      return;
    }

    (window as any).Office.context.mailbox.item.body.setAsync(
      content,
      { coercionType: (window as any).Office.CoercionType.Html },
      (result: any) => {
        if (result.status === (window as any).Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error('Failed to insert content into Outlook'));
        }
      }
    );
  });
}

/**
 * Utility function to get user's email from Outlook context
 */
export function getUserEmailFromOutlook(): string | null {
  try {
    return (window as any).Office?.context?.mailbox?.userProfile?.emailAddress || null;
  } catch (error) {
    console.warn('Could not get user email from Outlook context:', error);
    return null;
  }
}

/**
 * Utility function to detect language from Outlook
 */
export function getOutlookLanguage(): string {
  try {
    // Try to get language from Office context
    const displayLanguage = (window as any).Office?.context?.displayLanguage;
    if (displayLanguage) {
      // Map Office language codes to our supported languages
      const languageMap: { [key: string]: string } = {
        'en-US': 'english',
        'en-GB': 'english', 
        'en': 'english',
        'fr-FR': 'french',
        'fr': 'french',
        'es-ES': 'spanish',
        'es': 'spanish',
        'de-DE': 'german',
        'de': 'german',
        'it-IT': 'italian',
        'it': 'italian',
        'pt-PT': 'portuguese',
        'pt-BR': 'portuguese',
        'pt': 'portuguese',
        'nl-NL': 'dutch',
        'nl': 'dutch',
        'ru-RU': 'russian',
        'ru': 'russian',
        'ja-JP': 'japanese',
        'ja': 'japanese',
        'zh-CN': 'chinese',
        'zh-TW': 'chinese',
        'zh': 'chinese'
      };
      
      return languageMap[displayLanguage] || languageMap[displayLanguage.split('-')[0]] || 'french';
    }
    
    // Fallback to browser language
    const browserLang = navigator.language || 'fr-FR';
    const languageMap: { [key: string]: string } = {
      'en': 'english',
      'fr': 'french',
      'es': 'spanish',
      'de': 'german',
      'it': 'italian',
      'pt': 'portuguese',
      'nl': 'dutch',
      'ru': 'russian',
      'ja': 'japanese',
      'zh': 'chinese'
    };
    
    return languageMap[browserLang.split('-')[0]] || 'french';
  } catch (error) {
    console.warn('Could not detect language, defaulting to French:', error);
    return 'french';
  }
}
