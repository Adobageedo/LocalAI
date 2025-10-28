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
  IDropdownOption,
  getTheme,
  FontWeights,
  mergeStyles,
  IStackStyles
} from '@fluentui/react';
import { useAuth } from '../../contexts/AuthContext';
import { useOffice } from '../../contexts/OfficeContext';
import { useTranslations } from '../../utils/i18n';
import TemplateChatInterface from '../NewTemplate';
import { getAttachmentsWithContent, AttachmentInfo } from '../../utils/attachmentHelpers';

const TemplateGenerator: React.FC = () => {
  const { user } = useAuth();
  const { isOfficeReady, isLoadingEmail, currentEmail, insertTemplate } = useOffice();  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const t = useTranslations();
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conversationId, setConversationId] = useState<string>('');

  const theme = getTheme();
  
  // Wait until Office is ready and the email is loaded
  useEffect(() => {
    if (!isOfficeReady) {
      console.log('⏳ Office not ready yet...');
      return;
    }

    if (isLoadingEmail) {
      console.log('📨 Waiting for email to finish loading...');
      return;
    }

    if (currentEmail) {
      console.log('✅ Current email available:', currentEmail);

      // Create a deterministic conversation ID
      const emailIdentifier =
        currentEmail.conversationId ||
        currentEmail.internetMessageId ||
        currentEmail.subject?.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_') ||
        'email';

      const dateHash = Date.now();
      setConversationId(`${emailIdentifier}_${dateHash}`);
    } else {
      console.log('⚠️ No current email found');
      setConversationId(`random_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    }
  }, [isOfficeReady, isLoadingEmail, currentEmail]);

  // Load attachments only when the email is fully ready
  useEffect(() => {
    const loadAttachments = async () => {
      try {
        const attachmentsWithContent = await getAttachmentsWithContent();
        setAttachments(attachmentsWithContent);
        console.log('📎 Attachments loaded:', attachmentsWithContent);
      } catch (error) {
        console.error('❌ Failed to load attachments:', error);
      }
    };

    if (isOfficeReady && !isLoadingEmail && currentEmail) {
      loadAttachments();
    }
  }, [isOfficeReady, isLoadingEmail, currentEmail]);

  
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
  
  const secondaryButtonStyles = {
    root: {
      borderRadius: '12px',
      height: '44px',
      fontSize: '14px',
      fontWeight: FontWeights.regular,
      minWidth: '100px',
      border: `2px solid ${theme.palette.neutralLight}`,
      transition: 'all 0.2s ease-in-out',
      '@media (max-width: 768px)': {
        height: '40px',
        fontSize: '13px',
        minWidth: '90px'
      },
      '@media (max-width: 480px)': {
        height: '36px',
        fontSize: '12px',
        minWidth: '70px',
        padding: '0 8px'
      }
    }
  };
  
  const textFieldStyles = {
    fieldGroup: {
      borderRadius: '12px',
      border: `2px solid ${theme.palette.neutralLight}`,
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        borderColor: theme.palette.themePrimary
      }
    },
    field: {
      fontSize: '14px',
      lineHeight: '1.5'
    }
  };

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: t.toneProfessional },
    { key: 'friendly', text: t.toneFriendly },
    { key: 'formal', text: t.toneFormal },
    { key: 'casual', text: t.toneCasual },
    { key: 'urgent', text: t.toneUrgent },
    { key: 'apologetic', text: t.toneApologetic }
  ];

  const handleInsertTemplate = async (includeHistory: boolean = false) => {
    if (!generatedTemplate) {
      setError('No template to copy');
      return;
    }

    try {
      await insertTemplate(generatedTemplate, includeHistory);
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
    <Stack 
      tokens={{ childrenGap: 24 }} 
      styles={{ 
        root: { 
          padding: '8px 4px',
          backgroundColor: '#fafbfc',
          minHeight: '100vh',
          width: '100%',
          '@media (max-width: 768px)': {
            padding: '6px 2px'
          },
          '@media (max-width: 480px)': {
            padding: '4px 1px'
          }
        } 
      }}
    >

      {error && (
        <MessageBar 
          messageBarType={MessageBarType.error} 
          onDismiss={() => setError('')}
          styles={{
            root: {
              borderRadius: '12px',
              marginBottom: '16px',
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
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: FontWeights.regular
            }
          }}
        >
          {success}
        </MessageBar>
      )}

      {(
        <Stack tokens={{ childrenGap: 12 }}>
          {isStreaming && (
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center" styles={{ root: { padding: '12px', backgroundColor: theme.palette.themeLighterAlt, borderRadius: '8px' } }}>
              <Spinner size={SpinnerSize.small} />
              <Text styles={{ root: { color: theme.palette.themePrimary, fontWeight: FontWeights.semibold } }}>
                Génération en cours...
              </Text>
            </Stack>
          )}
          <TemplateChatInterface
            conversationId={"id"}//conversationId || Date.now().toString()}
            onTemplateUpdate={(newTemplate) => {
              setGeneratedTemplate(newTemplate);
              setSuccess('Template refined successfully!');
            }}
            emailContext={{
              subject: currentEmail?.subject,
              from: currentEmail?.from,
              additionalInfo,
              tone,
              body: currentEmail?.body,
              attachments: attachments.map(att => ({
                name: att.name,
                content: att.content
              }))
            }}
            quickActions={[
              { actionKey: 'reply' },
              { 
                actionKey: 'summarize', 
                email: true, 
                attachment: attachments.map(att => ({
                  name: att.name,
                  id: att.id,
                  content: att.content,
                  contentType: att.contentType
                }))
              },
            ]}
          />
          <Stack 
            horizontal 
            tokens={{ childrenGap: 12 }} 
            horizontalAlign="space-between"
            wrap
            styles={{
              root: {
                padding: '20px 8px',
                backgroundColor: '#f3f9ff',
                borderRadius: '12px',
                border: `2px solid ${theme.palette.themePrimary}`,
                width: '100%',
                '@media (max-width: 768px)': {
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px 6px'
                },
                '@media (max-width: 480px)': {
                  padding: '12px 4px'
                }
              }
            }}
          >
            <DefaultButton
              text="Nouveau Template"
              onClick={() => {
                setGeneratedTemplate('');
                setConversationId(Date.now().toString()); // New conversation ID
                setError('');
                setSuccess('');
              }}
              iconProps={{ iconName: 'Add' }}
              styles={secondaryButtonStyles}
            />
            <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
              <PrimaryButton
                text={t.insertTemplate}
                onClick={() => handleInsertTemplate(true)}
                iconProps={{ iconName: 'Mail' }}
                styles={modernButtonStyles}
              />
              <DefaultButton
                text="Copier"
                onClick={handleCopyTemplate}
                iconProps={{ iconName: 'Copy' }}
                styles={secondaryButtonStyles}
              />
            </Stack>
          </Stack>

        </Stack>
      )}
    </Stack>
  );
};

export default TemplateGenerator;
