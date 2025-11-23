import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { getAttachmentInfo, type AttachmentInfo } from '../utils/helpers/attachmentBackend.helpers';

// Helper to get last assistant message from chat localStorage
function getLastAssistantMessage(conversationId: string): string | null {
  if (!conversationId) return null;
  
  const saved = localStorage.getItem(`chat_${conversationId}`);
  if (!saved) return null;
  
  try {
    const messages = JSON.parse(saved);
    // Find last assistant message after at least one user message
    const hasUserMessage = messages.some((m: any) => m.role === 'user');
    if (!hasUserMessage) return null;
    
    // Get last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].content) {
        return messages[i].content;
      }
    }
  } catch (err) {
    console.error('Error reading chat messages:', err);
  }
  
  return null;
}

/**
 * Custom hook for template generation logic
 * Handles state management, email context, and attachments
 */
export function useTemplateGeneration() {
  const { user } = useAuth();
  const { isOfficeReady, isLoadingEmail, currentEmail, insertTemplate } = useOffice();
  
  // State
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conversationId, setConversationId] = useState<string>('');

  // Set conversation ID when email is ready
  useEffect(() => {
    if (!isOfficeReady) {
      return;
    }

    if (isLoadingEmail) {
      return;
    }

    if (currentEmail) {
      const emailIdentifier =
        currentEmail.conversationId ||
        currentEmail.internetMessageId ||
        currentEmail.subject?.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_') ||
        'email';

      setConversationId(emailIdentifier);
    } else {
      setConversationId(`random_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    }
  }, [isOfficeReady, isLoadingEmail, currentEmail]);

  // Load attachments when email is ready (metadata only, content fetched when sending)
  useEffect(() => {
    const loadAttachments = () => {
      try {
        const attachmentInfo = getAttachmentInfo();
        setAttachments(attachmentInfo);
      } catch (error) {
        console.error('❌ Failed to load attachments:', error);
      }
    };

    if (isOfficeReady && !isLoadingEmail && currentEmail) {
      loadAttachments();
    }
  }, [isOfficeReady, isLoadingEmail, currentEmail]);

  // Insert template into email (reader mode - creates reply)
  const handleInsertTemplate = useCallback(async (includeHistory: boolean = false) => {
    // Get last assistant message from chat
    const template = getLastAssistantMessage(conversationId);
    
    if (!template) {
      setError('No assistant message to insert');
      return;
    }

    try {
      await insertTemplate(template, includeHistory);
      setSuccess('Template inserted into reply!');
    } catch (error: any) {
      setError('Failed to insert template: ' + error.message);
    }
  }, [conversationId, insertTemplate]);

  // Start new conversation
  const handleNewTemplate = useCallback(() => {
    // Clear current conversation from localStorage
    if (conversationId) {
      localStorage.removeItem(`chat_${conversationId}`);
    }
    
    // Trigger re-render by updating conversationId
    setGeneratedTemplate('');
    setConversationId(Date.now().toString());
    setError('');
    setSuccess('');
  }, [conversationId]);

  // Clear messages
  const clearError = useCallback(() => setError(''), []);
  const clearSuccess = useCallback(() => setSuccess(''), []);

  // Check if there's an assistant message available
  const hasAssistantMessage = useCallback(() => {
    return getLastAssistantMessage(conversationId) !== null;
  }, [conversationId]);

  return {
    // User & context
    user,
    currentEmail,
    isOfficeReady,
    isLoadingEmail,
    
    // State
    attachments,
    additionalInfo,
    tone,
    generatedTemplate,
    isStreaming,
    error,
    success,
    conversationId,
    
    // Setters
    setAdditionalInfo,
    setTone,
    setGeneratedTemplate,
    setIsStreaming,
    
    // Actions
    handleInsertTemplate,
    handleNewTemplate,
    hasAssistantMessage,
    clearError,
    clearSuccess,
  };
}
