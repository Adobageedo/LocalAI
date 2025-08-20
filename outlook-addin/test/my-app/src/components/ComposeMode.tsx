import React, { useState, useEffect } from 'react';
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
import { useTranslations, getOutlookLanguage } from '../utils/i18n';

const ComposeMode: React.FC = () => {
  const { user } = useAuth();
  const { improveText } = useOffice();
  const t = useTranslations();
  
  const [prompt, setPrompt] = useState<string>('');
  const [tone, setTone] = useState<string>('professional');
  const [language, setLanguage] = useState<string>('english');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-detect language on component mount
  useEffect(() => {
    const detectedLang = getOutlookLanguage();
    setLanguage(detectedLang);
    console.log('Detected language:', detectedLang);
    setSuccess(`Language automatically set to ${detectedLang} based on your Outlook settings`);
  }, []);

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: t.toneProfessional || 'Professional' },
    { key: 'friendly', text: t.toneFriendly || 'Friendly' },
    { key: 'formal', text: t.toneFormal || 'Formal' },
    { key: 'casual', text: t.toneCasual || 'Casual' },
    { key: 'urgent', text: t.toneUrgent || 'Urgent' },
    { key: 'apologetic', text: t.toneApologetic || 'Apologetic' }
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
        language: language
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
          language: language
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
    <Stack tokens={{ childrenGap: 20 }}>
      <Text variant="xLarge">{t.composeAssistant || "Compose Assistant"}</Text>
      
      {error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {error}
        </MessageBar>
      )}
      
      {success && (
        <MessageBar messageBarType={MessageBarType.success}>
          {success}
        </MessageBar>
      )}
      
      {/* Generate new email section */}
      <Stack tokens={{ childrenGap: 8 }}>
        <Text variant="mediumPlus" style={{ fontWeight: 500 }}>{t.generateNewEmail || "Generate New Email"}</Text>
        <TextField
          label={t.describeEmail || "Describe what you want to write about"}
          multiline
          rows={3}
          value={prompt}
          onChange={(_, newValue) => setPrompt(newValue || '')}
          placeholder={t.emailPromptPlaceholder || "E.g., Write an email to schedule a meeting with the marketing team to discuss Q3 campaign plans"}
        />
        
        <Stack horizontal tokens={{ childrenGap: 8 }} style={{ width: '100%' }}>
          <Dropdown
            label={t.tone || "Tone"}
            selectedKey={tone}
            onChange={(_, option) => option && setTone(option.key as string)}
            options={toneOptions}
            styles={{ dropdown: { width: 150 } }}
          />
        </Stack>
        
        <PrimaryButton
          text={isGenerating ? t.generating || "Generating..." : t.generateEmail || "Generate Email"}
          onClick={generateEmail}
          disabled={isGenerating || !prompt.trim()}
          styles={{ root: { marginTop: 8 } }}
        >
          {isGenerating && <Spinner size={SpinnerSize.small} style={{ marginRight: 8 }} />}
        </PrimaryButton>
      </Stack>
      
      <div style={{ height: 1, backgroundColor: '#edebe9', margin: '16px 0' }} />
      
      {/* Improve current email section */}
      <Stack tokens={{ childrenGap: 8 }}>
        <Text variant="mediumPlus" style={{ fontWeight: 500 }}>{t.improveCurrentDraft || "Improve Current Draft"}</Text>
        <Text>{t.improveDescription || "Let AI help improve your current email draft with better grammar, clarity, and tone."}</Text>
        
        <Stack horizontal tokens={{ childrenGap: 8 }} style={{ width: '100%' }}>
          <Dropdown
            label={t.tone || "Tone"}
            selectedKey={tone}
            onChange={(_, option) => option && setTone(option.key as string)}
            options={toneOptions}
            styles={{ dropdown: { width: 150 } }}
          />
        </Stack>
        
        <PrimaryButton
          text={isImproving ? t.improving || "Improving..." : t.improveText || "Improve Current Text"}
          onClick={improveCurrentText}
          disabled={isImproving}
          styles={{ root: { marginTop: 8 } }}
        >
          {isImproving && <Spinner size={SpinnerSize.small} style={{ marginRight: 8 }} />}
        </PrimaryButton>
      </Stack>
    </Stack>
  );
};

export default ComposeMode;
