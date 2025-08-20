import React, { useEffect, useState } from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
  IconButton,
  Toggle
} from '@fluentui/react';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { useTranslations, getOutlookLanguage } from '../utils/i18n';
import TemplateGenerator from './TemplateGenerator';

const ReadMode: React.FC = () => {
  const { user } = useAuth();
  const { currentEmail } = useOffice();
  const t = useTranslations();
  
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [language, setLanguage] = useState<string>('english');
  const [activeTab, setActiveTab] = useState<string>('reply');

  // Auto-detect language on component mount
  useEffect(() => {
    const detectedLang = getOutlookLanguage();
    setLanguage(detectedLang);
    console.log('Detected language:', detectedLang);
  }, []);

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
        subject: currentEmail?.subject || '',
        from: currentEmail?.from || '',
        body: currentEmail?.body || '',
        conversationId: currentEmail?.conversationId || '',
        language: language
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

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { borderBottom: '1px solid #edebe9', paddingBottom: 8 } }}>
        <PrimaryButton 
          text={t.replyTab || "Reply"} 
          onClick={() => setActiveTab('reply')}
          primary={activeTab === 'reply'}
          styles={{ root: { minWidth: 100 } }}
        />
        <PrimaryButton 
          text={t.summarizeTab || "Summarize"} 
          onClick={() => setActiveTab('summarize')}
          primary={activeTab === 'summarize'}
          styles={{ root: { minWidth: 100 } }}
        />
      </Stack>

      {activeTab === 'reply' && (
        <TemplateGenerator />
      )}

      {activeTab === 'summarize' && (
        <Stack tokens={{ childrenGap: 16 }}>
          <Text variant="large">{t.summarizeTab || "Summarize Email"}</Text>
          <Text>{t.summarizeDescription || "Generate a concise summary of the current email."}</Text>
          
          <PrimaryButton
            text={isGenerating ? t.generating || "Generating..." : t.generateSummary || "Generate Summary"}
            onClick={generateSummary}
            disabled={isGenerating || !currentEmail}
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
              <Text>{t.summarizing || "Summarizing email..."}</Text>
            </Stack>
          )}
          
          {summary && (
            <Stack tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 16 } }}>
              <Text variant="mediumPlus" style={{ fontWeight: 500 }}>{t.summary || "Summary"}</Text>
              <Stack horizontal horizontalAlign="end">
                <IconButton
                  iconProps={{ iconName: 'Copy' }}
                  title={t.copyToClipboard || "Copy to clipboard"}
                  ariaLabel={t.copyToClipboard || "Copy to clipboard"}
                  onClick={() => {
                    navigator.clipboard.writeText(summary);
                    setSuccess(t.copiedToClipboard || 'Summary copied to clipboard');
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
      )}
    </Stack>
  );
};

export default ReadMode;
