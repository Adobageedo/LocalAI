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
 * Custom hook for email composer logic
 * Handles state management, email context, and attachments for compose mode
 */
export function useEmailComposer() {
  const { user } = useAuth();
  const { currentEmail, setBodyContent } = useOffice();
  
  // State
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conversationId, setConversationId] = useState<string>('');

  // Generate conversationId based on current email or random
  useEffect(() => {
    if (currentEmail) {
      const emailIdentifier = currentEmail.conversationId || 
                            currentEmail.internetMessageId ||
                            currentEmail.subject?.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_') || 
                            'email';
      const dateHash = Date.now();
      
      setConversationId(`${emailIdentifier}_${dateHash}`);
    } else {
      setConversationId(`random_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    }
  }, [currentEmail?.conversationId, currentEmail?.subject, currentEmail?.internetMessageId]);
  
  // Load email attachments (metadata only, content fetched when sending)
  useEffect(() => {
    const loadAttachments = () => {
      try {
        const attachmentInfo = getAttachmentInfo();
        setAttachments(attachmentInfo);
        console.log('📎 Attachments loaded:', attachmentInfo);
      } catch (error) {
        console.error('❌ Failed to load attachments:', error);
      }
    };
    
    if (currentEmail) {
      loadAttachments();
    }
  }, [currentEmail]);

  // Insert template into email (compose mode - sets body)
  const handleInsertTemplate = useCallback(async () => {
    // Get last assistant message from chat
    const template = getLastAssistantMessage(conversationId);
    
    if (!template) {
      setError('No assistant message to insert');
      return;
    }

    try {
      await setBodyContent(template);
      setSuccess('Template inserted into email!');
    } catch (error: any) {
      setError('Failed to insert template: ' + error.message);
    }
  }, [conversationId, setBodyContent]);

  // Copy template to clipboard
  const handleCopyTemplate = useCallback(() => {
    if (!generatedTemplate) {
      setError('No template to copy');
      return;
    }

    navigator.clipboard.writeText(generatedTemplate).then(() => {
      setSuccess('Template copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy template to clipboard');
    });
  }, [generatedTemplate]);

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

  // Update template from chat
  const handleTemplateUpdate = useCallback((newTemplate: string) => {
    setGeneratedTemplate(newTemplate);
    setSuccess('Template refined successfully!');
  }, []);

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
    handleCopyTemplate,
    handleNewTemplate,
    handleTemplateUpdate,
    hasAssistantMessage,
    clearError,
    clearSuccess,
  };
}
