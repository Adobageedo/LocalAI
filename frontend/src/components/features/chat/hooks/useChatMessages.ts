/**
 * Custom hook for managing chat messages
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { CHAT_CONFIG, STORAGE_KEYS } from '../constants';
import { loadMessagesFromStorage, generateMessageId } from '../utils/messageUtils';
import { LLM_QUICK_ACTIONS_DICTIONARY } from '../../../../config/llmQuickActions';
import { useOffice } from '../../../../contexts/OfficeContext';

interface UseChatMessagesProps {
  conversationId: string;
  quickActionKey?: string | null;
  compose?: boolean;
}

export function useChatMessages({ conversationId, quickActionKey, compose = false }: UseChatMessagesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { insertTemplate, setBodyContent } = useOffice();

  // Load conversation or initialize
  useEffect(() => {
    const saved = loadMessagesFromStorage(conversationId);
    
    if (saved) {
      setMessages(saved);
      return;
    }

    // If coming from QuickAction, start with user message
    if (quickActionKey) {
      const actionConfig = LLM_QUICK_ACTIONS_DICTIONARY[quickActionKey];
      if (actionConfig) {
        setMessages([{
          id: generateMessageId(),
          role: 'user',
          content: actionConfig.userPrompt,
          timestamp: new Date(),
        }]);
        return;
      }
    }

    // Only initialize if we don't have messages yet
    setMessages(prev => {
      if (prev.length > 1) {
        return prev;
      }

      return [{
        id: generateMessageId(),
        role: 'assistant',
        content: CHAT_CONFIG.DEFAULT_GREETING,
        timestamp: new Date(),
      }];
    });
  }, [conversationId, quickActionKey]);

  /**
   * Clear conversation and start fresh
   * Deletes localStorage for current conversationId and resets to default greeting
   */
  const handleNewTemplate = useCallback(() => {
    try {
      // Delete localStorage for this conversation
      console.log('Attempting to clear conversation from localStorage:', conversationId);
      const storageKey = STORAGE_KEYS.getChatKey(conversationId);
      localStorage.removeItem(storageKey);
      console.log('Cleared conversation from localStorage:', conversationId);

      // Reset messages to default greeting
      setMessages([{
        id: generateMessageId(),
        role: 'assistant',
        content: CHAT_CONFIG.DEFAULT_GREETING,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  }, [conversationId]);

  /**
   * Check if there's an assistant message (at least 2 messages in conversation)
   */
  const hasAssistantMessage = useCallback(() => {
    // Need at least 2 messages (1 user + 1 assistant)
    if (messages.length < 2) return false;
    
    // Check if there's at least one user message and one assistant message
    const hasUser = messages.some(m => m.role === 'user');
    const hasAssistant = messages.some(m => m.role === 'assistant' && m.content && m.content !== CHAT_CONFIG.DEFAULT_GREETING);
    
    return hasUser && hasAssistant;
  }, [messages]);

  /**
   * Get last assistant message content
   */
  const getLastAssistantMessage = useCallback((): string | null => {
    // Find last assistant message after at least one user message
    const hasUserMessage = messages.some(m => m.role === 'user');
    if (!hasUserMessage) return null;
    
    // Get last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].content) {
        return messages[i].content;
      }
    }
    
    return null;
  }, [messages]);

  /**
   * Insert template into email
   * - Read mode: Uses insertTemplate (creates reply)
   * - Compose mode: Uses setBodyContent (replaces current body)
   */
  const handleInsertTemplate = useCallback(async (includeHistory: boolean = false) => {
    const template = getLastAssistantMessage();
    
    if (!template) {
      throw new Error('No assistant message to insert');
    }

    try {
      if (compose) {
        // Compose mode: Replace email body content
        await setBodyContent(template);
      } else {
        // Read mode: Insert as reply with optional history
        await insertTemplate(template, includeHistory);
      }
      return true;
    } catch (error: any) {
      throw new Error('Failed to insert template: ' + error.message);
    }
  }, [compose, getLastAssistantMessage, insertTemplate, setBodyContent]);

  return { 
    messages, 
    setMessages, 
    handleNewTemplate, 
    hasAssistantMessage,
    handleInsertTemplate 
  };
}
