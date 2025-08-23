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
  ChoiceGroup,
  IChoiceGroupOption,
  TooltipHost,
  Icon
} from '@fluentui/react';
import { DocumentText24Regular, Mail24Regular } from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { authFetch } from '../utils/authFetch';
import { useTranslations, getOutlookLanguage } from '../utils/i18n';
import { canParseClientSide, parseFileContent } from '../utils/fileParser';

// Use HTTPS for backend API
const API_BASE_URL = "https://localhost:8000/api";
const API_SYNTHESIZE_ENDPOINT = `${API_BASE_URL}/outlook/synthesize`;
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
  const [summaryType, setSummaryType] = useState<FrontendSummaryType>('concise');
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
      if (typeof Office === 'undefined') {
        // Development mode - mock data
        setAttachments([
          { 
            id: 'mock-1', 
            name: 'Sample Document.docx', 
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 25600,
            isInline: false
          },
          { 
            id: 'mock-2', 
            name: 'Quarterly Report.pdf', 
            contentType: 'application/pdf',
            size: 512000,
            isInline: false
          }
        ]);
        setIsLoading(false);
        return;
      }

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
    // Update the attachment to show it's processing
    setAttachments(prev => 
      prev.map(att => 
        att.id === attachment.id 
          ? { ...att, isProcessing: true, errorMessage: undefined } 
          : att
      )
    );
    
    setError('');
    setSuccess('');

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const authToken = user.getIdToken ? await user.getIdToken() : null;

      if (typeof Office === 'undefined') {
        // Mock response in development mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mockSummary = `This is a synthesized summary of "${attachment.name}".

` +
          `The document appears to contain quarterly financial results, showing a 15% increase in revenue and plans for expansion in Q3. Key points include marketing strategy shifts and potential new product launches.`;
        
        setAttachments(prev => 
          prev.map(att => 
            att.id === attachment.id 
              ? { 
                  ...att, 
                  summary: mockSummary, 
                  isProcessing: false, 
                  processingMode: Math.random() > 0.5 ? 'client' : 'server' 
                } 
              : att
          )
        );
        
        setSuccess(`${attachment.name} summarized successfully (mock)`);
        return;
      }
      
      // Get attachment content
      Office.context.mailbox.item?.getAttachmentContentAsync(
        attachment.id,
        async (result) => {
          if (result.status !== Office.AsyncResultStatus.Succeeded) {
            throw new Error(`Failed to get attachment content: ${result.error?.message}`);
          }
          
          const content = result.value.content;
          if (!content) {
            throw new Error('Empty attachment content');
          }

          // Map frontend summary types to backend summary types
          let apiSummaryType: ApiSummaryType;
          if (summaryType === 'bullet') {
            apiSummaryType = 'bullet_points';
          } else if (summaryType === 'action') {
            apiSummaryType = 'action_items';
          } else {
            apiSummaryType = summaryType;
          }
          
          // Determine if we can parse this file client-side
          const canHandleClientSide = canParseClientSide(attachment.contentType);
          let fileText = '';
          let processingMode: ProcessingMode = 'server';
          
          try {
            if (canHandleClientSide) {
              console.log(`Processing ${attachment.name} client-side`);
              processingMode = 'client';
              
              // Extract text from file client-side
              fileText = await parseFileContent(content, attachment.contentType, attachment.name);
              
              // Update the attachment with the extracted text (for debug purposes)
              setAttachments(prev => 
                prev.map(att => 
                  att.id === attachment.id 
                    ? { ...att, extractedText: fileText, processingMode } 
                    : att
                )
              );

              // Call the backend API with just the extracted text
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
                  file_type: 'text/plain', // We're sending pre-processed text
                  body: fileText, // Using 'body' instead of 'file_content'
                  language: getOutlookLanguage(),
                  summary_type: apiSummaryType,
                  use_rag: false
                })
              });
              
              if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data && data.summary) {
                // Update the attachment with the summary
                setAttachments(prev => 
                  prev.map(att => 
                    att.id === attachment.id 
                      ? { ...att, summary: data.summary, isProcessing: false, processingMode } 
                      : att
                  )
                );
                
                setSuccess(`${attachment.name} summarized successfully (client-processed)`);
              } else {
                throw new Error('Invalid response from API');
              }
            } else {
              // Fall back to server-side processing for complex formats
              console.log(`Processing ${attachment.name} server-side`);
              processingMode = 'server';
              
              // Update processing mode
              setAttachments(prev => 
                prev.map(att => 
                  att.id === attachment.id 
                    ? { ...att, processingMode } 
                    : att
                )
              );
              
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
              
              if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
              }
              
              const data = await response.json();
              
              if (data && data.summary) {
                // Update the attachment with the summary
                setAttachments(prev => 
                  prev.map(att => 
                    att.id === attachment.id 
                      ? { ...att, summary: data.summary, isProcessing: false, processingMode } 
                      : att
                  )
                );
                
                setSuccess(`${attachment.name} summarized successfully (server-processed)`);
              } else {
                throw new Error('Invalid response from API');
              }
            }
          } catch (parseError: any) {
            console.error('Error during file processing:', parseError);
            
            // If client-side parsing fails, try server-side as fallback
            if (processingMode === 'client') {
              console.log('Falling back to server-side processing');
              
              try {
                processingMode = 'server';
                
                // Update processing mode
                setAttachments(prev => 
                  prev.map(att => 
                    att.id === attachment.id 
                      ? { ...att, processingMode, errorMessage: 'Client-side processing failed, trying server...' } 
                      : att
                  )
                );
                
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
                    file_content: content,
                    language: getOutlookLanguage(),
                    summary_type: apiSummaryType,
                    use_rag: false
                  })
                });
                
                if (!response.ok) {
                  throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data && data.summary) {
                  // Update the attachment with the summary
                  setAttachments(prev => 
                    prev.map(att => 
                      att.id === attachment.id 
                        ? { ...att, summary: data.summary, isProcessing: false, processingMode, errorMessage: undefined } 
                        : att
                    )
                  );
                  
                  setSuccess(`${attachment.name} summarized successfully (server fallback)`);
                } else {
                  throw new Error('Invalid response from API');
                }
              } catch (serverError: any) {
                throw new Error(`Server fallback failed: ${serverError.message}`);
              }
            } else {
              // If server processing was the original strategy and it failed
              throw parseError;
            }
          }
        }
      );
    } catch (error: any) {
      console.error('File summarization error:', error);
      
      // Update the attachment to show it's no longer processing
      setAttachments(prev => 
        prev.map(att => 
          att.id === attachment.id 
            ? { ...att, isProcessing: false, errorMessage: error.message } 
            : att
        )
      );
      
      setError(`Failed to summarize ${attachment.name}: ${error.message}`);
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
            {attachment.processingMode && !attachment.isProcessing && (
              <TooltipHost content={attachment.processingMode === 'client' ? 
                'This file was processed in the browser for faster results' : 
                'This file was processed by the server for better handling of complex formats'}>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }} 
                  styles={{ root: { cursor: 'pointer', padding: '0 8px' } }}>
                  <Icon iconName={attachment.processingMode === 'client' ? 'DesktopFlow' : 'CloudUpload'} 
                    styles={{ root: { color: attachment.processingMode === 'client' ? '#107C10' : '#0078D4', fontSize: '12px' } }} />
                  <Text variant="small" styles={{ root: { color: attachment.processingMode === 'client' ? '#107C10' : '#0078D4' } }}>
                    {attachment.processingMode === 'client' ? 'Client' : 'Server'}
                  </Text>
                </Stack>
              </TooltipHost>
            )}
          </Stack>
          
          <Text variant="small" styles={{ root: { color: '#666', marginLeft: '8px' } }}>
            {(attachment.size / 1024).toFixed(1)} KB • {attachment.contentType.split('/')[1]}
          </Text>
          
          {attachment.isProcessing && (
            <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { margin: '8px' } }}>
              <Spinner size={SpinnerSize.small} />
              <Stack>
                <Text>Processing{attachment.processingMode ? ` (${attachment.processingMode})` : ''}...</Text>
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
    if (!currentEmail || !user) return;
    
    setIsSummarizing(true);
    setEmailSummary('');
    setError('');
    setSuccess('');

    try {
      // Get authentication token
      const authToken = user.getIdToken ? await user.getIdToken() : null;
      
      if (typeof Office === 'undefined') {
        // Development mode - mock response
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockSummary = `This is a mock email summary of type "${summaryType}".

` +
          `The email would be summarized according to your preferences.`;
          
        setEmailSummary(mockSummary);
        setSuccess('Email summarized successfully (mock)');
      } else {
        if (!currentEmail.body) {
          throw new Error('Email body is empty');
        }
        
        // Map frontend summary types to backend summary types
        let apiSummaryType: ApiSummaryType;
        if (summaryType === 'bullet') {
          apiSummaryType = 'bullet_points';
        } else if (summaryType === 'action') {
          apiSummaryType = 'action_items';
        } else {
          apiSummaryType = summaryType; // 'concise' and 'detailed' are the same in both
        }
        
        // Prepare request data
        const requestData = {
          authToken,
          userId: user.uid,
          subject: currentEmail.subject,
          from: currentEmail.from,
          body: currentEmail.body,
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
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data && data.summary) {
          setEmailSummary(data.summary);
          setSuccess('Email summarized successfully');
        } else {
          throw new Error('Invalid response from API');
        }
      }
    } catch (error: any) {
      console.error('Email summarization error:', error);
      setError(`Failed to summarize email: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Summary type options
  const summaryTypeOptions: IChoiceGroupOption[] = [
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
          <ChoiceGroup 
            selectedKey={summaryType}
            options={summaryTypeOptions}
            onChange={(_, option) => option && setSummaryType(option.key as FrontendSummaryType)}
            styles={{ root: { marginBottom: '8px' } }}
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
