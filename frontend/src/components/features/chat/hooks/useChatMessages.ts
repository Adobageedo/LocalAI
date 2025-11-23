/**
 * Custom hook for managing chat messages
 */

import { useState, useEffect } from 'react';
import { ChatMessage } from '../types';
import { CHAT_CONFIG } from '../constants';
import { loadMessagesFromStorage, generateMessageId } from '../utils/messageUtils';
import { LLM_QUICK_ACTIONS_DICTIONARY } from '../../../../config/llmQuickActions';

interface UseChatMessagesProps {
  conversationId: string;
  quickActionKey?: string | null;
}

export function useChatMessages({ conversationId, quickActionKey }: UseChatMessagesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  return { messages, setMessages };
}
