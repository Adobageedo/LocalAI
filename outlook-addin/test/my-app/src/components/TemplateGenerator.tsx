import React, { useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { useTranslations } from '../utils/i18n';
import axios from 'axios';

const API_BASE_URL = "https://chardouin.fr/api";
const API_PROMPT_ENDPOINT = `${API_BASE_URL}/prompt`;

const TemplateGenerator: React.FC = () => {
  const { user } = useAuth();
  const { currentEmail, insertTemplate } = useOffice();
  const t = useTranslations();
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [tone, setTone] = useState<string>('professional');
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

  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      // Get Firebase auth token
      const authToken = await user?.getIdToken();
      
      const requestData = {
        // Firebase Authentication
        authToken: authToken,
        userId: user?.uid || 'anonymous',
        
        // User Input
        additionalInfo: additionalInfo.trim() || null,
        tone: tone,
        
        // Email Context
        subject: currentEmail?.subject || null,
        from: currentEmail?.from || null,
        body: currentEmail?.body || null,
        conversationId: currentEmail?.conversationId || null
      };

      // Log the data being sent to API
      console.log('=== API REQUEST DATA ===');
      console.log('Auth Token:', authToken ? `${authToken.substring(0, 20)}...` : 'No token');
      console.log('User ID:', requestData.userId);
      console.log('Additional Info:', requestData.additionalInfo);
      console.log('Tone:', requestData.tone);
      console.log('Subject:', requestData.subject);
      console.log('From:', requestData.from);
      console.log('Body Length:', requestData.body?.length || 0);
      console.log('Body Preview:', requestData.body?.substring(0, 200) + '...');
      console.log('Conversation ID:', requestData.conversationId);
      
      console.log('Full Request Data:', JSON.stringify({
        ...requestData,
        authToken: authToken ? '[REDACTED]' : null // Don't log full token
      }, null, 2));
      console.log('=== END API REQUEST DATA ===');

      const response = await axios.post(API_PROMPT_ENDPOINT, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : undefined,
        },
        timeout: 3000 // 3 second timeout
      });

      if (response.data && response.data.generated_text) {
        setGeneratedTemplate(response.data.generated_text);
        setSuccess('Template generated successfully!');
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error: any) {
      console.error('Template generation error:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else if (error.response) {
        setError(`API Error: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        setError('Network error. Please check your connection.');
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

      {generatedTemplate && (
        <Stack tokens={{ childrenGap: 12 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            {t.templateGenerated}:
          </Text>
          <div
            style={{
              border: '1px solid #e1e1e1',
              borderRadius: '4px',
              padding: '12px',
              backgroundColor: '#f8f8f8',
              minHeight: '100px',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.4'
            }}
          >
            {generatedTemplate}
          </div>
          
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
      )}
    </Stack>
  );
};

export default TemplateGenerator;
