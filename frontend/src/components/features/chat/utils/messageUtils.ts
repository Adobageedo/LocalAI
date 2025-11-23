/**
 * Utility functions for message handling
 */

import { ChatMessage } from '../types';
import { STORAGE_KEYS } from '../constants';

/**
 * Load messages from localStorage
 */
export function loadMessagesFromStorage(conversationId: string): ChatMessage[] | null {
  const saved = localStorage.getItem(STORAGE_KEYS.getChatKey(conversationId));
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    return parsed.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));
  } catch (err) {
    console.error('Error loading conversation:', err);
    return null;
  }
}

/**
 * Save messages to localStorage
 */
export function saveMessagesToStorage(conversationId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.getChatKey(conversationId), JSON.stringify(messages));
  } catch (err) {
    console.error('Error saving conversation:', err);
  }
}

/**
 * Generate unique message ID
 */
export function generateMessageId(offset: number = 0): string {
  return (Date.now() + offset).toString();
}

/**
 * Find last assistant message index
 */
export function findLastAssistantMessageIndex(messages: ChatMessage[]): number {
  return messages
    .map((msg, idx) => msg.role === 'assistant' ? idx : -1)
    .filter(idx => idx !== -1)
    .pop() ?? -1;
}

/**
 * Check if it's a new conversation (no user messages yet)
 */
export function isNewConversation(messages: ChatMessage[]): boolean {
  return messages.every(m => m.role !== 'user');
}
