import React, { useState } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  Dropdown,
  IDropdownOption,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
  Toggle
} from '@fluentui/react';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { useTranslations } from '../utils/i18n';

const ComposeAssistant: React.FC = () => {
  const { user } = useAuth();
  const { improveText } = useOffice();
  const t = useTranslations();
  
  const [prompt, setPrompt] = useState<string>('');
  const [tone, setTone] = useState<string>('professional');
  const [language, setLanguage] = useState<string>('english');
  const [useRag, setUseRag] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: t.toneProfessional || 'Professional' },
    { key: 'friendly', text: t.toneFriendly || 'Friendly' },
    { key: 'formal', text: t.toneFormal || 'Formal' },
    { key: 'casual', text: t.toneCasual || 'Casual' },
    { key: 'urgent', text: t.toneUrgent || 'Urgent' },
    { key: 'apologetic', text: t.toneApologetic || 'Apologetic' }
  ];
  
  const languageOptions: IDropdownOption[] = [
    { key: 'english', text: 'English' },
    { key: 'spanish', text: 'Spanish (Español)' },
    { key: 'french', text: 'French (Français)' },
    { key: 'german', text: 'German (Deutsch)' },
    { key: 'portuguese', text: 'Portuguese (Português)' },
    { key: 'italian', text: 'Italian (Italiano)' },
    { key: 'dutch', text: 'Dutch (Nederlands)' },
    { key: 'russian', text: 'Russian (Русский)' },
    { key: 'japanese', text: 'Japanese (日本語)' },
    { key: 'chinese', text: 'Chinese (中文)' }
  ];

  const generateEmail = async () => {
    if (!prompt.trim()) {
      setError('Please provide a description for your email');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      // Get Firebase token for authentication
      const token = user ? await user.getIdToken() : '';
      
      // Prepare request data
      const requestData = {
        authToken: token,
        userId: user?.uid || '',
        prompt: prompt,
        tone: tone,
        language: language,
        use_rag: useRag
      };

      // Log request (with redacted token)
      console.log('Generating email with:', {
        ...requestData,
        authToken: token ? `${token.substring(0, 20)}...` : 'none'
      });

      // Make API request
      const response = await fetch('https://localhost:8001/api/outlook/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Insert the generated template into the compose form
      if (data.generated_text) {
        await improveText(data.generated_text);
        setSuccess('Email generated successfully');
      } else {
        throw new Error('No content generated');
      }
    } catch (err) {
      console.error('Error generating email:', err);
      setError(`Failed to generate email: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const improveCurrentText = async () => {
    setIsImproving(true);
    setError('');
    setSuccess('');

    try {
      // Get Firebase token for authentication
      const token = user ? await user.getIdToken() : '';
      
      // Get the current text from the compose form
      if (typeof Office === 'undefined') {
        throw new Error('Office.js is not available');
      }
      
      const item = Office.context.mailbox.item;
      if (!item) {
        throw new Error('No email item available');
      }
      
      // Get the current body text
      item.body.getAsync('text', async (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          setError('Failed to get email content');
          setIsImproving(false);
          return;
        }
        
        const currentText = result.value;
        
        // Prepare request data
        const requestData = {
          authToken: token,
          userId: user?.uid || '',
          body: currentText,
          tone: tone,
          language: language,
          use_rag: useRag,
          improvement_type: 'general'
        };
        
        try {
          // Make API request
          const response = await fetch('https://localhost:8001/api/outlook/improve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Update the compose form with the improved text
          if (data.generated_text) {
            await improveText(data.generated_text);
            setSuccess('Email improved successfully');
          } else {
            throw new Error('No improved content generated');
          }
        } catch (err) {
          console.error('Error in API call:', err);
          setError(`Failed to improve email: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
          setIsImproving(false);
        }
      });
    } catch (err) {
      console.error('Error improving email:', err);
      setError(`Failed to improve email: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsImproving(false);
    }
  };

  return (
    <Stack tokens={{ childrenGap: 16, padding: '16px 0' }}>
      <Text variant="large" style={{ fontWeight: 600 }}>Email Composer Assistant</Text>
      
      {/* Generate new email section */}
      <Stack tokens={{ childrenGap: 8 }}>
        <Text variant="mediumPlus" style={{ fontWeight: 500 }}>Generate New Email</Text>
        <TextField
          label="Describe what you want to write about"
          multiline
          rows={3}
          value={prompt}
          onChange={(_, newValue) => setPrompt(newValue || '')}
          placeholder="E.g., Write an email to schedule a meeting with the marketing team to discuss Q3 campaign plans"
        />
        
        <Stack horizontal tokens={{ childrenGap: 8 }} style={{ width: '100%' }}>
          <Dropdown
            label="Tone"
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
            onChange={(_: React.MouseEvent<HTMLElement>, checked?: boolean) => setUseRag(!!checked)}
            styles={{ root: { marginBottom: 0 } }}
          />
          <Text variant="small" style={{ color: '#666' }}>(May be slower)</Text>
        </Stack>
        
        <PrimaryButton
          text="Generate Email"
          onClick={generateEmail}
          disabled={isGenerating || !prompt.trim()}
          styles={{ root: { marginTop: 8 } }}
        >
          {isGenerating && <Spinner size={SpinnerSize.small} style={{ marginRight: 8 }} />}
        </PrimaryButton>
      </Stack>
      
      <div style={{ margin: '16px 0', height: 1, background: '#edebe9' }} />
      
      {/* Improve current email section */}
      <Stack tokens={{ childrenGap: 8 }}>
        <Text variant="mediumPlus" style={{ fontWeight: 500 }}>Improve Current Draft</Text>
        <Text>Let AI help improve your current email draft with better grammar, clarity, and tone.</Text>
        
        <Stack horizontal tokens={{ childrenGap: 8 }} style={{ width: '100%' }}>
          <Dropdown
            label="Tone"
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
            onChange={(_: React.MouseEvent<HTMLElement>, checked?: boolean) => setUseRag(!!checked)}
            styles={{ root: { marginBottom: 0 } }}
          />
          <Text variant="small" style={{ color: '#666' }}>(May be slower)</Text>
        </Stack>
        
        <PrimaryButton
          text="Improve Current Text"
          onClick={improveCurrentText}
          disabled={isImproving}
          styles={{ root: { marginTop: 8 } }}
        >
          {isImproving && <Spinner size={SpinnerSize.small} style={{ marginRight: 8 }} />}
        </PrimaryButton>
      </Stack>
      
      {/* Status messages */}
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
    </Stack>
  );
};

export default ComposeAssistant;
