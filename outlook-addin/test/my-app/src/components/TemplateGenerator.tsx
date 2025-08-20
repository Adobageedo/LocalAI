import React, { useState, useEffect } from 'react';
import {
  Stack,
  TextField,
  PrimaryButton,
  DefaultButton,
  Text,
  Dropdown,
  IDropdownOption,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Toggle
} from '@fluentui/react';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { useTranslations, getOutlookLanguage } from '../utils/i18n';
import { authFetch } from '../utils/authFetch';

// Use HTTPS for backend API
const API_BASE_URL = "https://localhost:8001/api";
const API_PROMPT_ENDPOINT = `${API_BASE_URL}/outlook/prompt`;

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

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: t.toneProfessional },
    { key: 'friendly', text: t.toneFriendly },
    { key: 'formal', text: t.toneFormal },
    { key: 'casual', text: t.toneCasual },
    { key: 'urgent', text: t.toneUrgent },
    { key: 'apologetic', text: t.toneApologetic }
  ];

  const languageOptions: IDropdownOption[] = [
    { key: 'en', text: 'English' },
    { key: 'fr', text: 'French' },
    { key: 'es', text: 'Spanish' },
    { key: 'de', text: 'German' },
    { key: 'it', text: 'Italian' },
    { key: 'pt', text: 'Portuguese' },
    { key: 'zh', text: 'Chinese' },
    { key: 'ja', text: 'Japanese' },
    { key: 'ko', text: 'Korean' },
  ];

  // Auto-detect language and set initial values on component mount
  useEffect(() => {
    // Set language based on Outlook settings
    const detectedLang = getOutlookLanguage();
    setLanguage(detectedLang);
    
    // Always set RAG to false initially (will be true in production)
    setUseRag(false);
  }, []);

  const generateTemplate = async () => {
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

      const response = await authFetch(API_PROMPT_ENDPOINT, {
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
    <Stack tokens={{ childrenGap: 16, padding: '16px 0' }}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="large" style={{ fontWeight: 600 }}>AI Email Reply Generator</Text>
      </Stack>

      <TextField
        label={t.additionalInfo || "Additional Information (Optional)"}
        multiline
        rows={3}
        value={additionalInfo}
        onChange={(_, newValue) => setAdditionalInfo(newValue || '')}
        placeholder={t.additionalInfoPlaceholder || "Add any specific requirements, context, or details for your reply..."}
      />

      <Stack horizontal tokens={{ childrenGap: 8 }} style={{ width: '100%' }}>
        <Dropdown
          label={t.tone || "Tone"}
          selectedKey={tone}
          onChange={(_, option) => option && setTone(option.key as string)}
          options={toneOptions}
          styles={{ dropdown: { width: 150 } }}
        />
        
        <Dropdown
          label="Language"
          selectedKey={language}
          onChange={(_, option) => option && setLanguage(option.key as string)}
          options={languageOptions}
          styles={{ dropdown: { width: 150 } }}
        />
      </Stack>
      
      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
        <Toggle 
          label="Use Knowledge Base" 
          checked={useRag} 
          onChange={(_, checked) => setUseRag(!!checked)}
          styles={{ root: { marginBottom: 0 } }}
        />
        <Text variant="small" style={{ color: '#666' }}>(May be slower)</Text>
      </Stack>

      <PrimaryButton
        text={isGenerating ? t.generatingTemplate || "Generating..." : "Generate Reply"}
        onClick={generateTemplate}
        disabled={isGenerating || !currentEmail}
      />

      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          dismissButtonAriaLabel="Close"
        >
          {error}
        </MessageBar>
      )}

      {success && (
        <MessageBar
          messageBarType={MessageBarType.success}
          isMultiline={false}
          dismissButtonAriaLabel="Close"
        >
          {success}
        </MessageBar>
      )}

      {isGenerating && (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }}>
          <Spinner size={SpinnerSize.small} />
          <Text>{t.loading || "Loading..."}</Text>
        </Stack>
      )}

      {generatedTemplate && !isGenerating && (
        <Stack tokens={{ childrenGap: 8 }}>
          <Text variant="mediumPlus" style={{ fontWeight: 500 }}>Reply Generated</Text>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f8f8f8', 
            border: '1px solid #edebe9',
            borderRadius: '2px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <Text>{generatedTemplate}</Text>
          </div>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <PrimaryButton 
              text="Insert as Reply" 
              onClick={handleInsertTemplate} 
            />
            <DefaultButton 
              text="Copy" 
              onClick={handleCopyTemplate} 
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};

export default TemplateGenerator;
