import React, { useState, useEffect } from 'react';
import { 
  Stack, 
  Text, 
  TextField, 
  PrimaryButton, 
  DefaultButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Dropdown,
  IDropdownOption
} from '@fluentui/react';
import { Sparkle20Regular } from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useOffice } from '../../contexts/OfficeContext';
import { useTranslations, getOutlookLanguage } from '../../utils/i18n';
import { authFetch } from '../../utils/authFetch';
import { API_ENDPOINTS } from '../../config/api';
import TemplateChatInterface from './TemplateChatInterface';

const TemplateGenerator: React.FC = () => {
  const { user } = useAuth();
  const { currentEmail, insertTemplate } = useOffice();
  const t = useTranslations();
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [language, setLanguage] = useState<string>('en');
  const [useRag, setUseRag] = useState<boolean>(false);
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: t.toneProfessional },
    { key: 'friendly', text: t.toneFriendly },
    { key: 'formal', text: t.toneFormal },
    { key: 'casual', text: t.toneCasual },
    { key: 'urgent', text: t.toneUrgent },
    { key: 'apologetic', text: t.toneApologetic }
  ];

  // Auto-detect language and set initial values on component mount
  useEffect(() => {
    // Set language based on Outlook settings
    const detectedLang = getOutlookLanguage();
    setLanguage(detectedLang);
    
    // Always set RAG to false initially (will be true in production)
    setUseRag(false);
  }, []);

  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const requestData = {
        // User Input
        additionalInfo: additionalInfo.trim() || null,
        tone: tone,
        language: language,
        use_rag: useRag,
        
        // Email Context
        subject: currentEmail?.subject || null,
        from: currentEmail?.from || null,
        body: currentEmail?.body || null,
        conversationId: currentEmail?.conversationId || null
      };

      // Log the data being sent to API
      console.log('=== API REQUEST DATA ===');
      console.log('Additional Info:', requestData.additionalInfo);
      console.log('Tone:', requestData.tone);
      console.log('Language:', requestData.language);
      console.log('Use RAG:', requestData.use_rag);
      console.log('Subject:', requestData.subject);
      console.log('From:', requestData.from);
      console.log('Body Length:', requestData.body?.length || 0);
      console.log('Body Preview:', requestData.body?.substring(0, 200) + '...');
      console.log('Conversation ID:', requestData.conversationId);
      
      console.log('Full Request Data:', JSON.stringify(requestData, null, 2));
      console.log('=== END API REQUEST DATA ===');

      const response = await authFetch(API_ENDPOINTS.OUTLOOK_PROMPT, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.generated_text) {
        console.log('=== API RESPONSE DATA ===');
        console.log('Generated Text:', data.generated_text);
        console.log('=== END API RESPONSE DATA ===');
        setGeneratedTemplate(data.generated_text);
        setSuccess('Template generated successfully!');
        // Create new conversation for this template
        setConversationId(Date.now().toString());
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error: any) {
      console.error('Template generation error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network error. Please check your connection and ensure the backend is running.');
      } else if (error.message.includes('API request failed')) {
        setError(`API Error: ${error.message}`);
      } else if (error.message === 'User not authenticated') {
        setError('Authentication error. Please sign in again.');
      } else {
        setError('Failed to generate template. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertTemplate = async () => {
    if (!generatedTemplate) {
      setError('No template to insert');
      return;
    }

    try {
      await insertTemplate(generatedTemplate);
      setSuccess('Template inserted into new email!');
    } catch (error: any) {
      setError('Failed to insert template: ' + error.message);
    }
  };

  const handleCopyTemplate = () => {
    if (!generatedTemplate) {
      setError('No template to copy');
      return;
    }

    navigator.clipboard.writeText(generatedTemplate).then(() => {
      setSuccess('Template copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy template to clipboard');
    });
  };

  if (!user) {
    return null;
  }

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <Sparkle20Regular style={{ fontSize: '18px', color: '#0078d4' }} />
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          {t.generateTemplate}
        </Text>
      </Stack>

      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
          {error}
        </MessageBar>
      )}

      {success && (
        <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setSuccess('')}>
          {success}
        </MessageBar>
      )}

      {!generatedTemplate && (
        <>
          <TextField
            label={t.additionalInfo}
            multiline
            rows={2}
            value={additionalInfo}
            onChange={(_, newValue) => setAdditionalInfo(newValue || '')}
            placeholder={t.additionalInfoPlaceholder}
            disabled={isGenerating}
          />

          <Dropdown
            label={t.tone}
            selectedKey={tone}
            onChange={(_, option) => setTone(option?.key as string)}
            options={toneOptions}
            disabled={isGenerating}
          />

          <PrimaryButton
            text={isGenerating ? t.generatingTemplate : t.generateTemplate}
            onClick={handleGenerateTemplate}
            disabled={isGenerating}
            iconProps={{ iconName: 'Sparkle' }}
          />

          {isGenerating && (
            <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }}>
              <Spinner size={SpinnerSize.small} />
              <Text variant="medium">{t.generatingTemplate}</Text>
            </Stack>
          )}
        </>
      )}

      {generatedTemplate && (
        <Stack tokens={{ childrenGap: 12 }}>          
          <TemplateChatInterface
            initialTemplate={generatedTemplate}
            conversationId={conversationId || Date.now().toString()}
            onTemplateUpdate={(newTemplate) => {
              setGeneratedTemplate(newTemplate);
              setSuccess('Template refined successfully!');
            }}
            isInline={true}
            userRequest={`Please create an email template based on the provided context`}
            emailContext={{
              subject: currentEmail?.subject,
              from: currentEmail?.from,
              additionalInfo: additionalInfo,
              tone: tone
            }}
          />
          <Stack horizontal tokens={{ childrenGap: 8 }} horizontalAlign="space-between">
            {/* <DefaultButton
              text="New Template"
              onClick={() => {
                setGeneratedTemplate('');
                setConversationId(null);
                setError('');
                setSuccess('');
              }}
              iconProps={{ iconName: 'Add' }}
            /> */}
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <PrimaryButton
                text={t.insertTemplate}
                onClick={handleInsertTemplate}
                iconProps={{ iconName: 'Mail' }}
              />
              <DefaultButton
                text="Copy to Clipboard"
                onClick={handleCopyTemplate}
                iconProps={{ iconName: 'Copy' }}
              />
            </Stack>
          </Stack>

        </Stack>
      )}
    </Stack>
  );
};

export default TemplateGenerator;
