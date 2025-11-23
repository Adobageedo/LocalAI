/**
 * Custom hook for syncing QuickAction streaming with chat messages
 */

import { useEffect } from 'react';
import { ChatMessage } from '../types';
import { getLLMQuickAction } from '../../../../config/llmQuickActions';
import { generateMessageId } from '../utils/messageUtils';

interface UseQuickActionSyncProps {
  quickActionState: {
    isActive: boolean;
    streamedContent: string;
    actionKey: string | null;
  };
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function useQuickActionSync({ quickActionState, setMessages }: UseQuickActionSyncProps) {
  useEffect(() => {
    if (!quickActionState.isActive || !quickActionState.streamedContent) {
      return;
    }

    setMessages(prev => {
      const actionKey = quickActionState.actionKey;
      const actionConfig = actionKey ? getLLMQuickAction(actionKey) : null;

      // Use actionKey in IDs to support multiple QuickActions in same conversation
      const userMessageId = `quickaction-user-${actionKey}`;
      const assistantMessageId = `quickaction-stream-${actionKey}`;

      // Check if we already have messages for THIS specific QuickAction
      const hasUserMessage = prev.some(m => m.id === userMessageId);
      const hasAssistantMessage = prev.some(m => m.id === assistantMessageId);

      const newMessages = [...prev];

      // Add user message first (only once per action)
      if (!hasUserMessage && actionConfig) {
        newMessages.push({
          id: userMessageId,
          role: 'user',
          content: actionConfig.userPrompt,
          timestamp: new Date(),
        });
      }

      // Add or update assistant response
      if (hasAssistantMessage) {
        // Update existing assistant message
        return newMessages.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: quickActionState.streamedContent }
            : m
        );
      } else {
        // Add new assistant message
        newMessages.push({
          id: assistantMessageId,
          role: 'assistant',
          content: quickActionState.streamedContent,
          timestamp: new Date(),
        });
        return newMessages;
      }
    });
  }, [quickActionState.streamedContent, quickActionState.isActive, quickActionState.actionKey, setMessages]);
}
