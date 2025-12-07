/**
 * Custom hook for sending messages and handling LLM streaming
 */

import { useState, useCallback } from 'react';
import { ChatMessage, EmailContext, ChatSettings } from '../types';
import { CHAT_CONFIG } from '../constants';
import { generateMessageId, saveMessagesToStorage } from '../utils/messageUtils';
import { extractStreamingResponse, parseFinalResponse } from '../utils/jsonParsingUtils';
import { buildSystemPrompt,buildSystemPromptBaux, buildUserPrompt } from '../../../../config/prompt';
import { llmService } from '../../../../services/api';
import type { Attachment } from '../../../../services/api/llmService';
import { getEmailAttachmentsForBackend } from '../../../../utils/helpers/attachmentBackend.helpers';

interface UseMessageSenderProps {
  conversationId: string;
  emailContext: EmailContext;
  compose: boolean;
  hasAttachments: boolean;
  settings: ChatSettings;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function useMessageSender({
  conversationId,
  emailContext,
  compose,
  hasAttachments,
  settings,
  messages,
  setMessages
}: UseMessageSenderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const isFirstMessage = messages.length === 1;

    // Get attachments if enabled
    let attachments: Attachment[] | undefined;
    if (settings.includeAttachments && hasAttachments) {
      try {
        attachments = await getEmailAttachmentsForBackend();
        console.log(`✅ Sending ${attachments.length} attachments to backend`);
      } catch (error) {
        console.error('❌ Failed to get attachments:', error);
        setError('Échec du chargement des pièces jointes');
      }
    }

    // Build context without attachments (backend handles them)
    const contextToUse = { ...emailContext, attachments: undefined };

    // Build LLM content with context for first message
    const llmContent = isFirstMessage
      ? buildUserPrompt(contextToUse, messageText, compose)
      : messageText.trim();

    // Create user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    setIsLoading(true);
    setError('');

    // Create placeholder for assistant message
    const aiMessageId = generateMessageId(1);
    const aiMsg: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    const withPlaceholder = [...updated, aiMsg];
    setMessages(withPlaceholder);

    try {
      // Build conversation messages array
      const conversationMessagesLLM: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }> = [];

      // Add system prompt
      conversationMessagesLLM.push({
        role: 'system',
        content: buildSystemPromptBaux()// content: buildSystemPrompt(contextToUse)
      });

      // Add conversation history
      updated.forEach(msg => {
        const content = msg.content === messageText.trim() ? llmContent : msg.content;
        conversationMessagesLLM.push({
          role: msg.role,
          content
        });
      });

      // Get last user message for prompt
      const lastUserMessage = [...conversationMessagesLLM]
        .reverse()
        .find(msg => msg.role === 'user');
      const prompt = lastUserMessage?.content || 'Default fallback prompt';

      // Select model
      const modelToUse = settings.useFineTune
        ? CHAT_CONFIG.FINE_TUNED_MODEL
        : CHAT_CONFIG.DEFAULT_MODEL;

      // Stream response
      let accumulatedText = '';

      for await (const chunk of llmService.streamPrompt({
        prompt,
        messages: conversationMessagesLLM,
        maxTokens: CHAT_CONFIG.MAX_TOKENS,
        temperature: CHAT_CONFIG.TEMPERATURE,
        rag: settings.useRag,
        model: modelToUse,
        attachments
      })) {
        if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Stream error');
        }

        if (chunk.type === 'chunk' && chunk.delta) {
          accumulatedText += chunk.delta;
          const displayText = extractStreamingResponse(accumulatedText);

          // Update assistant message in real-time
          setMessages(prev =>
            prev.map(m =>
              m.id === aiMessageId
                ? { ...m, content: displayText }
                : m
            )
          );
        }

        if (chunk.type === 'done') {
          // Parse final response
          const { content, buttons } = parseFinalResponse(accumulatedText);

          // Finalize and save
          setMessages(prev => {
            const final = prev.map(m =>
              m.id === aiMessageId
                ? { ...m, content, suggestedButtons: buttons }
                : m
            );
            saveMessagesToStorage(conversationId, final);
            return final;
          });
        }
      }
    } catch (err: any) {
      setError('Erreur de communication avec le serveur.');
      console.error(err);
      setMessages(updated);
    } finally {
      setIsLoading(false);
    }
  }, [
    conversationId,
    emailContext,
    compose,
    hasAttachments,
    settings,
    messages,
    isLoading,
    setMessages
  ]);

  return { sendMessage, isLoading, error, setError };
}
