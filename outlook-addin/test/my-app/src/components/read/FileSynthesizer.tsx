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
  Icon,
  getTheme,
  FontWeights,
  mergeStyles,
  IStackStyles
} from '@fluentui/react';
import { DocumentText24Regular, Mail24Regular, DocumentSearch24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useOffice } from '../../contexts/OfficeContext';
import { authFetch } from '../../utils/authFetch';
import { useTranslations, getOutlookLanguage } from '../../utils/i18n';
import { API_ENDPOINTS } from '../../config/api';

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

  const theme = getTheme();
  
  const cardStyles: IStackStyles = {
    root: {
      backgroundColor: theme.palette.white,
      border: `1px solid ${theme.palette.neutralLight}`,
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '32px',
      marginBottom: '20px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      '@media (max-width: 768px)': {
        padding: '20px',
        borderRadius: '12px'
      },
      '@media (max-width: 480px)': {
        padding: '16px',
        margin: '0 -8px 16px -8px'
      },
      '&:hover': {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        transform: 'translateY(-2px)',
        borderColor: theme.palette.themePrimary
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${theme.palette.themePrimary}, ${theme.palette.themeSecondary})`,
        borderRadius: '16px 16px 0 0'
      }
    }
  };
  
  const headerStyles = mergeStyles({
    fontSize: '20px',
    fontWeight: FontWeights.bold,
    color: theme.palette.neutralPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    paddingTop: '8px'
  });
  
  const subHeaderStyles = mergeStyles({
    fontSize: '14px',
    fontWeight: FontWeights.regular,
    color: theme.palette.neutralSecondary,
    marginBottom: '24px',
    lineHeight: '1.4'
  });
  
  const modernButtonStyles = {
    root: {
      borderRadius: '12px',
      height: '44px',
      fontSize: '14px',
      fontWeight: FontWeights.semibold,
      minWidth: '120px',
      transition: 'all 0.2s ease-in-out',
      '@media (max-width: 768px)': {
        height: '40px',
        fontSize: '13px',
        minWidth: '100px'
      },
      '@media (max-width: 480px)': {
        height: '36px',
        fontSize: '12px',
        minWidth: '80px',
        padding: '0 12px'
      }
    }
  };
  
  const summaryCardStyles: IStackStyles = {
    root: {
      backgroundColor: '#f8fffe',
      border: `2px solid ${theme.palette.green}`,
      borderRadius: '12px',
      padding: '20px',
      marginTop: '16px',
      boxShadow: '0 2px 8px rgba(0, 120, 212, 0.1)'
    }
  };
  
  const attachmentCardStyles = {
    root: {
      margin: '8px 0',
      borderRadius: '12px',
      border: `1px solid ${theme.palette.neutralLight}`,
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
        transform: 'translateY(-1px)',
        borderColor: theme.palette.themePrimary
      }
    }
  };

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
            const response = await authFetch(API_ENDPOINTS.OUTLOOK_SUMMARIZE, {
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
        text: 'Synthétiser',
        onClick: () => handleSynthesizeFile(attachment),
        disabled: attachment.isProcessing,
        styles: {
          root: {
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: FontWeights.semibold,
            backgroundColor: theme.palette.themePrimary,
            color: theme.palette.white,
            border: 'none',
            '&:hover': {
              backgroundColor: theme.palette.themeDark
            }
          }
        }
      }
    ];

    return (
      <DocumentCard styles={attachmentCardStyles}>
        <DocumentCardDetails>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }} styles={{ root: { padding: '4px 0' } }}>
            <DocumentText24Regular 
              style={{ 
                fontSize: '20px', 
                color: theme.palette.themePrimary 
              }} 
            />
            <Stack>
              <DocumentCardTitle 
                title={attachment.name} 
                styles={{
                  root: {
                    fontSize: '16px',
                    fontWeight: FontWeights.semibold,
                    color: theme.palette.neutralPrimary
                  }
                }}
              />
              <Text 
                variant="small" 
                styles={{ 
                  root: { 
                    color: theme.palette.neutralSecondary,
                    fontSize: '12px',
                    marginTop: '2px'
                  } 
                }}
              >
                {(attachment.size / 1024).toFixed(1)} KB • {attachment.contentType.split('/')[1]?.toUpperCase()}
              </Text>
            </Stack>
          </Stack>
          
          {attachment.isProcessing && (
            <Stack 
              horizontal 
              tokens={{ childrenGap: 12 }} 
              styles={{ 
                root: { 
                  margin: '12px 0',
                  padding: '12px 16px',
                  backgroundColor: theme.palette.themeLighterAlt,
                  borderRadius: '8px',
                  border: `1px solid ${theme.palette.themeLight}`
                } 
              }}
            >
              <Spinner 
                size={SpinnerSize.small} 
                styles={{ circle: { borderTopColor: theme.palette.themePrimary } }} 
              />
              <Stack>
                <Text 
                  styles={{ 
                    root: { 
                      fontSize: '14px',
                      fontWeight: FontWeights.semibold,
                      color: theme.palette.themePrimary
                    } 
                  }}
                >
                  Analyse en cours...
                </Text>
                {attachment.errorMessage && (
                  <Text 
                    variant="small" 
                    styles={{ 
                      root: { 
                        color: theme.palette.redDark,
                        marginTop: '4px'
                      } 
                    }}
                  >
                    {attachment.errorMessage}
                  </Text>
                )}
              </Stack>
            </Stack>
          )}
          
          {attachment.summary && (
            <Stack styles={summaryCardStyles}>
              <Text 
                styles={{ 
                  root: { 
                    fontSize: '14px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    color: theme.palette.neutralPrimary
                  } 
                }}
              >
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
      const response = await authFetch(API_ENDPOINTS.OUTLOOK_SUMMARIZE, {
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
    <Stack 
      tokens={{ childrenGap: 24 }} 
      styles={{ 
        root: { 
          padding: '24px',
          backgroundColor: '#fafbfc',
          minHeight: '100vh',
          '@media (max-width: 768px)': {
            padding: '16px'
          },
          '@media (max-width: 480px)': {
            padding: '12px'
          }
        } 
      }}
    >
      {/* Email Summary Section */}
      <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
        <Text className={headerStyles}>
          <Mail24Regular /> Résumer l'Email
        </Text>
        <Text className={subHeaderStyles}>
          Générez un résumé intelligent de l'email actuel selon le type de synthèse souhaité.
        </Text>

        <Dropdown
          label={t.summaryType || 'Type de Résumé'}
          selectedKey={emailSummaryType}
          options={summaryTypeOptions}
          onChange={(_, option) => option && setEmailSummaryType(option.key as FrontendSummaryType)}
          styles={{
            dropdown: { borderRadius: '12px', width: '200px' },
            title: { borderRadius: '12px', border: `2px solid ${theme.palette.neutralLight}` }
          }}
        />

        <PrimaryButton 
          onClick={handleSummarizeEmail} 
          disabled={isSummarizing || !currentEmail}
          styles={modernButtonStyles}
          iconProps={{ iconName: 'Mail' }}
        >
          {isSummarizing ? 'Résumé en cours...' : 'Résumer l\'Email'}
        </PrimaryButton>

        {isSummarizing && (
          <Stack 
            horizontal 
            horizontalAlign="center" 
            tokens={{ childrenGap: 12 }} 
            styles={{ 
              root: { 
                padding: '16px 24px',
                backgroundColor: theme.palette.themeLighterAlt,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.themeLight}`,
                marginTop: '16px'
              } 
            }}
          >
            <Spinner 
              size={SpinnerSize.medium} 
              styles={{ circle: { borderTopColor: theme.palette.themePrimary } }} 
            />
            <Text 
              styles={{ 
                root: { 
                  fontSize: '16px', 
                  fontWeight: FontWeights.semibold, 
                  color: theme.palette.themePrimary 
                } 
              }}
            >
              Analyse en cours...
            </Text>
          </Stack>
        )}

        {emailSummary && (
          <Stack styles={summaryCardStyles}>
            <Text 
              styles={{ 
                root: { 
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: theme.palette.neutralPrimary
                } 
              }}
            >
              {emailSummary}
            </Text>
          </Stack>
        )}
      </Stack>

      {/* Attachments Section */}
      <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
        <Text className={headerStyles}>
          <DocumentText24Regular /> Synthétiser les Pièces Jointes
        </Text>
        <Text className={subHeaderStyles}>
          Analysez et résumez automatiquement le contenu des fichiers joints à cet email.
        </Text>
        
        <Dropdown
          label={t.summaryType || 'Type de Synthèse'}
          selectedKey={fileSummaryType}
          options={summaryTypeOptions}
          onChange={(_, option) => option && setFileSummaryType(option.key as FrontendSummaryType)}
          styles={{
            dropdown: { borderRadius: '12px', width: '200px' },
            title: { borderRadius: '12px', border: `2px solid ${theme.palette.neutralLight}` }
          }}
        />

        {error && (
          <MessageBar 
            messageBarType={MessageBarType.error} 
            onDismiss={() => setError('')}
            styles={{
              root: {
                borderRadius: '12px',
                marginTop: '16px',
                fontSize: '14px',
                fontWeight: FontWeights.regular
              }
            }}
          >
            {error}
          </MessageBar>
        )}

        {success && (
          <MessageBar 
            messageBarType={MessageBarType.success} 
            onDismiss={() => setSuccess('')}
            styles={{
              root: {
                borderRadius: '12px',
                marginTop: '16px',
                fontSize: '14px',
                fontWeight: FontWeights.regular
              }
            }}
          >
            {success}
          </MessageBar>
        )}

        {isLoading ? (
          <Stack 
            horizontal 
            horizontalAlign="center" 
            tokens={{ childrenGap: 12 }} 
            styles={{ 
              root: { 
                padding: '24px',
                backgroundColor: theme.palette.themeLighterAlt,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.themeLight}`
              } 
            }}
          >
            <Spinner 
              size={SpinnerSize.medium} 
              styles={{ circle: { borderTopColor: theme.palette.themePrimary } }} 
            />
            <Text 
              styles={{ 
                root: { 
                  fontSize: '16px', 
                  fontWeight: FontWeights.semibold, 
                  color: theme.palette.themePrimary 
                } 
              }}
            >
              {t.loading || 'Chargement des pièces jointes...'}
            </Text>
          </Stack>
        ) : attachments.length > 0 ? (
          <List
            items={attachments}
            onRenderCell={(item?: Attachment, index?: number) => {
              return item ? renderAttachment(item) : null;
            }}
          />
        ) : (
          <Stack 
            horizontalAlign="center" 
            styles={{ 
              root: { 
                padding: '32px', 
                backgroundColor: theme.palette.neutralLighterAlt,
                borderRadius: '12px',
                border: `1px dashed ${theme.palette.neutralLight}`
              } 
            }}
          >
            <DocumentText24Regular 
              style={{ 
                fontSize: '48px', 
                color: theme.palette.neutralTertiary, 
                marginBottom: '12px' 
              }} 
            />
            <Text 
              styles={{ 
                root: { 
                  fontSize: '16px',
                  color: theme.palette.neutralSecondary,
                  textAlign: 'center'
                } 
              }}
            >
              {t.noAttachments || 'Aucune pièce jointe trouvée dans cet email'}
            </Text>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};

export default FileSynthesizer;
