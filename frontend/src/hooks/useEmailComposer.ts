import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { getAttachmentInfo, type AttachmentInfo } from '../utils/helpers/attachmentBackend.helpers';

/**
 * Custom hook for email composer logic
 * Handles state management, email context, and attachments for compose mode
 */
export function useEmailComposer() {
  const { user } = useAuth();
  const { currentEmail, insertTemplate } = useOffice();
  
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
    setGeneratedTemplate('');
    setConversationId(Date.now().toString());
    setError('');
    setSuccess('');
  }, []);

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
