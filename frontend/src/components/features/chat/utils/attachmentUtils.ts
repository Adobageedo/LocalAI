/**
 * Utilities for attachment handling
 */

import { QuickAction } from '../types';
import { ALLOWED_EXTENSIONS } from '../constants';

/**
 * Filter attachments by allowed extensions
 */
export function filterAttachmentsByExtension(
  attachments: QuickAction['attachment']
): QuickAction['attachment'] {
  if (!attachments) return [];
  
  return attachments.filter(att => {
    const extension = att.name.substring(att.name.lastIndexOf('.')).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(extension as any);
  });
}

/**
 * Build file context string for LLM
 */
export function buildFileContext(fileName: string, content?: string): string {
  if (content) {
    return `\n\n=== ATTACHMENT TO SUMMARIZE ===\nFile Name: ${fileName}\n\nFile Content:\n${content}`;
  }
  
  return `\n\nNote: File "${fileName}" content could not be extracted. Please ask user if they can provide the key information from this file.`;
}
