import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { AttachmentInfo, getAttachmentsWithContent } from '../utils/helpers';

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

  // Load attachments when email is ready
  useEffect(() => {
    const loadAttachments = async () => {
      try {
        const attachmentsWithContent = await getAttachmentsWithContent();
        setAttachments(attachmentsWithContent);
      } catch (error) {
        console.error('❌ Failed to load attachments:', error);
      }
    };

    if (isOfficeReady && !isLoadingEmail && currentEmail) {
      loadAttachments();
    }
  }, [isOfficeReady, isLoadingEmail, currentEmail]);

  // Insert template into email
  const handleInsertTemplate = useCallback(async (includeHistory: boolean = false) => {
    if (!generatedTemplate) {
      setError('No template to insert');
      return;
    }

    try {
      await insertTemplate(generatedTemplate, includeHistory);
      setSuccess('Template inserted into new email!');
    } catch (error: any) {
      setError('Failed to insert template: ' + error.message);
    }
  }, [generatedTemplate, insertTemplate]);

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
    handleCopyTemplate,
    handleNewTemplate,
    handleTemplateUpdate,
    clearError,
    clearSuccess,
  };
}
