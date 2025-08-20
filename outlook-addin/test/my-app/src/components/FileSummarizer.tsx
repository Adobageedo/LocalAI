import React, { useState } from 'react';
import {
  Stack,
  PrimaryButton,
  Text,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Dropdown,
  IDropdownOption,
  Toggle,
  IconButton
} from '@fluentui/react';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { useTranslations } from '../utils/i18n';

const FileSummarizer: React.FC = () => {
  const { user } = useAuth();
  const { currentEmail: emailData } = useOffice();
  const t = useTranslations();
  
  const [summary, setSummary] = useState<string>('');
  const [useKnowledgeBase, setUseKnowledgeBase] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('english');
  const [summaryType, setSummaryType] = useState<string>('concise');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const summaryTypeOptions: IDropdownOption[] = [
    { key: 'concise', text: 'Concise' },
    { key: 'detailed', text: 'Detailed' },
    { key: 'bullet', text: 'Bullet Points' },
    { key: 'action', text: 'Action Items' }
  ];

  const generateSummary = async () => {
    setIsGenerating(true);
    setError('');
    setSuccess('');
    setSummary('');

    try {
      // Get Firebase token for authentication
      const token = user ? await user.getIdToken() : '';
      
      // Prepare request data
      const requestData = {
        authToken: token,
        userId: user?.uid || '',
        subject: emailData?.subject || '',
        from: emailData?.from || '',
        body: emailData?.body || '',
        conversationId: emailData?.conversationId || '',
        language: language,
        use_rag: useKnowledgeBase,
        summary_type: summaryType
      };

      // Log request (with redacted token)
      console.log('Summarizing email with:', {
        ...requestData,
        authToken: token ? `${token.substring(0, 20)}...` : 'none',
        body: requestData.body ? `${requestData.body.substring(0, 100)}...` : 'none'
      });

      // Make API request
      const response = await fetch('https://localhost:8001/api/outlook/summarize', {
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
      
      // Set the summary
      if (data.generated_text) {
        setSummary(data.generated_text);
        setSuccess('Summary generated successfully');
      } else {
        throw new Error('No summary generated');
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(`Failed to generate summary: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary);
    setSuccess('Summary copied to clipboard');
  };

  return (
    <Stack tokens={{ childrenGap: 16, padding: '16px 0' }}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="large" style={{ fontWeight: 600 }}>Email Summarizer</Text>
      </Stack>
      
      <Text>Generate a concise summary of the current email to quickly understand its key points.</Text>
      
      <Stack horizontal tokens={{ childrenGap: 8 }} style={{ width: '100%' }}>
        <Dropdown
          label="Summary Type"
          selectedKey={summaryType}
          onChange={(_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => option && setSummaryType(option.key as string)}
          options={summaryTypeOptions}
          styles={{ dropdown: { width: 150 } }}
        />
        
        <Dropdown
          label="Language"
          selectedKey={language}
          onChange={(_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => option && setLanguage(option.key as string)}
          options={languageOptions}
          styles={{ dropdown: { width: 150 } }}
        />
      </Stack>
      
      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
        <Toggle 
          label="Use Knowledge Base" 
          checked={useKnowledgeBase} 
          onChange={(_: React.MouseEvent<HTMLElement>, checked?: boolean) => setUseKnowledgeBase(!!checked)}
        />
        <Text variant="small" style={{ color: '#666' }}>(May be slower)</Text>
      </Stack>

      <PrimaryButton
        text={isGenerating ? "Generating..." : "Generate Summary"}
        onClick={generateSummary}
        disabled={isGenerating || !emailData}
      />
      
      {error && (
        <Stack styles={{ root: { marginTop: 16 } }}>
          <MessageBar messageBarType={MessageBarType.error}>
            {error}
          </MessageBar>
        </Stack>
      )}
      
      {success && !isGenerating && (
        <Stack styles={{ root: { marginTop: 16 } }}>
          <MessageBar messageBarType={MessageBarType.success}>
            {success}
          </MessageBar>
        </Stack>
      )}
      
      {isGenerating && (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 16 } }}>
          <Spinner size={SpinnerSize.small} />
          <Text>Summarizing email...</Text>
        </Stack>
      )}
      
      {summary && (
        <Stack tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 16 } }}>
          <Text variant="mediumPlus" style={{ fontWeight: 500 }}>Summary</Text>
          <Stack horizontal horizontalAlign="end">
            <IconButton
              iconProps={{ iconName: 'Copy' }}
              title="Copy to clipboard"
              ariaLabel="Copy to clipboard"
              onClick={() => {
                navigator.clipboard.writeText(summary);
                setSuccess('Summary copied to clipboard');
              }}
            />
          </Stack>
          <div className="summary-content" style={{ 
            padding: 12, 
            backgroundColor: '#f3f2f1', 
            borderRadius: 4,
            whiteSpace: 'pre-wrap'
          }}>
            {summary}
          </div>
        </Stack>
      )}
    </Stack>
  );
};

export default FileSummarizer;
