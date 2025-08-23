import React, { useState, useEffect } from 'react';
import { 
  Stack, 
  Text, 
  PrimaryButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  List,
  DocumentCard,
  DocumentCardTitle,
  DocumentCardDetails,
  DocumentCardActions,
  IButtonProps,
  Separator,
  Dropdown,
  IDropdownOption,
  TooltipHost,
  Icon
} from '@fluentui/react';
import { DocumentText24Regular, Mail24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useOffice } from '../../contexts/OfficeContext';
import { authFetch } from '../../utils/authFetch';
import { useTranslations, getOutlookLanguage } from '../../utils/i18n';

// Use HTTPS for backend API
const API_BASE_URL = "https://localhost:8000/api";
const API_SUMMARIZE_ENDPOINT = `${API_BASE_URL}/outlook/summarize`;

interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  content?: string;
  extractedText?: string;
  summary?: string;
  isProcessing?: boolean;
  processingMode?: 'client' | 'server';
  errorMessage?: string;
}

// Frontend summary type - matches keys used in UI components
type FrontendSummaryType = 'concise' | 'detailed' | 'bullet' | 'action';

// Backend API summary type - matches API parameter values
type ApiSummaryType = 'concise' | 'detailed' | 'bullet_points' | 'action_items';

// File processing mode
type ProcessingMode = 'client' | 'server';

const FileSynthesizer: React.FC = () => {
  const { user } = useAuth();
  const { isOfficeReady, currentEmail } = useOffice();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [emailSummary, setEmailSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [emailSummaryType, setEmailSummaryType] = useState<FrontendSummaryType>('concise');
  const [fileSummaryType, setFileSummaryType] = useState<FrontendSummaryType>('concise');
  const t = useTranslations();

  // Load attachments when component mounts
  useEffect(() => {
    if (isOfficeReady) {
      loadAttachments();
    }
  }, [isOfficeReady, currentEmail]);

  const loadAttachments = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const item = Office.context.mailbox.item;
      if (!item || typeof item.attachments === 'undefined') {
        setAttachments([]);
        setIsLoading(false);
        return;
      }

      const attachmentList: Attachment[] = [];
      
      // Get attachments from current email
      if (Array.isArray(item.attachments)) {
        for (const attachment of item.attachments) {
          if (!attachment.isInline) {
            attachmentList.push({
              id: attachment.id,
              name: attachment.name,
              contentType: attachment.contentType,
              size: attachment.size,
              isInline: attachment.isInline
            });
          }
        }
      }
      
      setAttachments(attachmentList);
    } catch (error) {
      console.error('Error loading attachments:', error);
      setError('Failed to load attachments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSynthesizeFile = async (attachment: Attachment) => {
    // Reset error/success states
    setError('');
    setSuccess('');
    
    // Mark this attachment as processing
    setAttachments(prev => 
      prev.map(att => 
        att.id === attachment.id ? { ...att, isProcessing: true, errorMessage: undefined } : att
      )
    );
    
    try {
      // Map UI summary types to API summary types
      let apiSummaryType: ApiSummaryType = 'detailed';
      if (fileSummaryType === 'bullet') {
        apiSummaryType = 'bullet_points';
      } else if (fileSummaryType === 'action') {
        apiSummaryType = 'action_items';
      } else if (fileSummaryType === 'concise') {
        apiSummaryType = 'concise';
      }
      
      // Get authentication token for API calls
      if (!user) {
        throw new Error('User not authenticated');
      }

      const authToken = user.getIdToken ? await user.getIdToken() : null;
      if (!authToken) {
        throw new Error('Failed to get authentication token');
      }
      
      // Get attachment content
      Office.context.mailbox.item?.getAttachmentContentAsync(
        attachment.id,
        async (result) => {
          if (result.status !== Office.AsyncResultStatus.Succeeded) {
            const errorMessage = `Failed to get attachment: ${result.error?.message || 'Unknown error'}`;
            console.error(errorMessage);
            
            setAttachments(prev => 
              prev.map(att => 
                att.id === attachment.id ? { ...att, isProcessing: false, errorMessage } : att
              )
            );
            
            setError(errorMessage);
            return;
          }
          
          const content = result.value.content;
          if (!content) {
            const errorMessage = 'Empty attachment content';
            console.error(errorMessage);
            
            setAttachments(prev => 
              prev.map(att => 
                att.id === attachment.id ? { ...att, isProcessing: false, errorMessage } : att
              )
            );
            
            setError(errorMessage);
            return;
          }
          
          const processingMode = 'server';
          
          try {            
            // Update processing mode
            setAttachments(prev => 
              prev.map(att => 
                att.id === attachment.id ? { ...att, processingMode } : att
              )
            );
                        
            // Add performance monitoring
            const startTime = performance.now();
            const fileSize = attachment.size;
            
            // Send raw file content to server
            const response = await authFetch(API_SUMMARIZE_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                authToken: authToken,
                userId: user.uid,
                file_name: attachment.name,
                file_type: attachment.contentType,
                file_content: content, // Send base64 content directly
                language: getOutlookLanguage(),
                summary_type: apiSummaryType,
                use_rag: false
              })
            });
            
            // Calculate processing time
            const endTime = performance.now();
            const processingTimeMs = endTime - startTime;
            
            // Log performance metrics
            console.log(`Performance metrics for ${attachment.name}:`);
            console.log(`- File size: ${fileSize} bytes`);
            console.log(`- Processing time: ${processingTimeMs.toFixed(2)} ms`);
            console.log(`- Processing speed: ${((fileSize / 1024) / (processingTimeMs / 1000)).toFixed(2)} KB/s`);
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data && data.summary) {
              let finalSummary = data.summary;
              if (finalSummary == "Impossible to summarize this file") {
                finalSummary = t.emptySummary;
              }
              // Update the attachment with the summary
              setAttachments(prev => 
                prev.map(att => 
                  att.id === attachment.id 
                    ? { ...att, summary: finalSummary, isProcessing: false, processingMode, errorMessage: undefined } 
                    : att
                )
              );
            } else {
              throw new Error('Invalid response from API');
            }
          } catch (error: any) {
            console.error(`Error processing attachment ${attachment.name}:`, error);
            
            // Update attachment with error
            setAttachments(prev => 
              prev.map(att => 
                att.id === attachment.id 
                  ? { ...att, isProcessing: false, errorMessage: error.message } 
                  : att
              )
            );
            
            setError(`Failed to process ${attachment.name}: ${error.message}`);
          }
        }
      );
    } catch (error: any) {
      console.error(`Error handling attachment ${attachment.name}:`, error);
      
      // Update attachment with error
      setAttachments(prev => 
        prev.map(att => 
          att.id === attachment.id 
            ? { ...att, isProcessing: false, errorMessage: error.message } 
            : att
        )
      );
      
      setError(`Failed to process ${attachment.name}: ${error.message}`);
    }
  };

  const renderAttachment = (attachment: Attachment) => {
    const actionProps: IButtonProps[] = [
      {
        iconProps: { iconName: 'DocumentSearch' },
        text: 'Synthesize',
        onClick: () => handleSynthesizeFile(attachment),
        disabled: attachment.isProcessing
      }
    ];

    return (
      <DocumentCard styles={{ root: { margin: '8px 0' } }}>
        <DocumentCardDetails>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            <DocumentCardTitle title={attachment.name} />
          </Stack>
          
          <Text variant="small" styles={{ root: { color: '#666', marginLeft: '8px' } }}>
            {(attachment.size / 1024).toFixed(1)} KB • {attachment.contentType.split('/')[1]}
          </Text>
          
          {attachment.isProcessing && (
            <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { margin: '8px' } }}>
              <Spinner size={SpinnerSize.small} />
              <Stack>
                <Text>Processing...</Text>
                {attachment.errorMessage && (
                  <Text variant="small" styles={{ root: { color: '#a80000' } }}>{attachment.errorMessage}</Text>
                )}
              </Stack>
            </Stack>
          )}
          
          {attachment.summary && (
            <Stack styles={{ root: { margin: '8px', padding: '8px', backgroundColor: '#f8f8f8', borderRadius: '4px' } }}>
              <Text variant="small" styles={{ root: { whiteSpace: 'pre-wrap' } }}>
                {attachment.summary}
              </Text>
            </Stack>
          )}
        </DocumentCardDetails>
        <DocumentCardActions actions={actionProps} />
      </DocumentCard>
    );
  };

  // Handle email summarization
  const handleSummarizeEmail = async () => {
    setIsSummarizing(true);
    setEmailSummary('');
    setError('');
    setSuccess('');
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!currentEmail) {
        throw new Error('No email selected');
      }

      // Get authentication token
      const authToken = user.getIdToken ? await user.getIdToken() : null;
      if (!authToken) {
        throw new Error('Failed to get authentication token');
      }
      
      // Map frontend summary types to backend summary types
      let apiSummaryType: ApiSummaryType;
      if (emailSummaryType === 'bullet') {
        apiSummaryType = 'bullet_points';
      } else if (emailSummaryType === 'action') {
        apiSummaryType = 'action_items';
      } else {
        apiSummaryType = emailSummaryType;
      }
      
      // Get email content from Office context
      const emailBody = currentEmail.body || '';
      const emailSubject = currentEmail.subject || '';
      const emailFrom = currentEmail.from || '';
      
      // Add performance monitoring
      const startTime = performance.now();
      const contentSize = emailBody.length + emailSubject.length;
            
      // Prepare request data following the API structure from memory
      const requestData = {
        authToken: authToken,
        userId: user.uid,
        subject: emailSubject,
        from: emailFrom,
        body: emailBody,
        language: getOutlookLanguage(),
        summary_type: apiSummaryType,
        use_rag: false
      };
      
      // Make API request
      const response = await authFetch(API_SUMMARIZE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Calculate processing time
      const endTime = performance.now();
      const processingTimeMs = endTime - startTime;
      
      // Log performance metrics
      console.log('Email summarization performance metrics:');
      console.log(`- Content size: ${contentSize} characters`);
      console.log(`- Processing time: ${processingTimeMs.toFixed(2)} ms`);
      console.log(`- Processing speed: ${(contentSize / (processingTimeMs / 1000)).toFixed(2)} chars/s`);
      
      if (data && data.summary) {
        setEmailSummary(data.summary);
        setSuccess('Email summarized successfully');
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error: any) {
      console.error('Email summarization error:', error);
      setError(`Failed to summarize email: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Summary type options for dropdowns
  const summaryTypeOptions: IDropdownOption[] = [
    { key: 'concise', text: t.concise || 'Concise' },
    { key: 'detailed', text: t.detailed || 'Detailed' },
    { key: 'bullet', text: t.bulletPoints || 'Bullet Points' },
    { key: 'action', text: t.actionItems || 'Action Items' }
  ];

  if (!user) {
    return null;
  }

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
      {/* Email Summary Section */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <Mail24Regular style={{ fontSize: '18px', color: '#0078d4' }} />
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          {t.synthesizeEmail || 'Summarize Email'}
        </Text>
      </Stack>

      <Stack tokens={{ childrenGap: 10 }} styles={{ root: { marginBottom: '16px' } }}>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <Dropdown
            label={t.summaryType || 'Summary Type'}
            selectedKey={emailSummaryType}
            options={summaryTypeOptions}
            onChange={(_, option) => option && setEmailSummaryType(option.key as FrontendSummaryType)}
            styles={{ dropdown: { width: 180 }, root: { marginBottom: '8px' } }}
          />
        </Stack>

        <PrimaryButton 
          onClick={handleSummarizeEmail} 
          disabled={isSummarizing || !currentEmail}
          styles={{ root: { width: 'auto', alignSelf: 'flex-start' } }}
        >
          {isSummarizing ? (
            <>
              <Spinner size={SpinnerSize.xSmall} styles={{ root: { marginRight: '8px' } }} />
              {t.synthesizing || 'Summarizing...'}
            </>
          ) : (
            t.summarizeEmail || 'Summarize Email'
          )}
        </PrimaryButton>

        {emailSummary && (
          <Stack 
            styles={{ 
              root: { 
                backgroundColor: '#f8f8f8', 
                padding: '12px', 
                borderRadius: '4px',
                marginTop: '12px'
              } 
            }}
          >
            <Text variant="medium" styles={{ root: { whiteSpace: 'pre-wrap' } }}>
              {emailSummary}
            </Text>
          </Stack>
        )}
      </Stack>

      <Separator />

      {/* Attachments Section */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <DocumentText24Regular style={{ fontSize: '18px', color: '#0078d4' }} />
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          {t.synthesizeAttachments || 'Synthesize Attachments'}
        </Text>
      </Stack>
      
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: '8px' } }}>
        <Dropdown
          label={t.summaryType || 'Summary Type'}
          selectedKey={fileSummaryType}
          options={summaryTypeOptions}
          onChange={(_, option) => option && setFileSummaryType(option.key as FrontendSummaryType)}
          styles={{ dropdown: { width: 180 }, root: { marginBottom: '8px' } }}
        />
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

      {isLoading ? (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { padding: '20px' } }}>
          <Spinner size={SpinnerSize.small} />
          <Text>{t.loading || 'Loading attachments...'}</Text>
        </Stack>
      ) : attachments.length > 0 ? (
        <List
          items={attachments}
          onRenderCell={(item?: Attachment, index?: number) => {
            return item ? renderAttachment(item) : null;
          }}
        />
      ) : (
        <Stack horizontalAlign="center" styles={{ root: { padding: '20px', color: '#666' } }}>
          <Text>{t.noAttachments || 'No attachments found in this email'}</Text>
        </Stack>
      )}
    </Stack>
  );
};

export default FileSynthesizer;
