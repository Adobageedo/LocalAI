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
import { Sparkle24Regular, Mail24Regular, Copy24Regular, Add24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useOffice } from '../../contexts/OfficeContext';
import { useTranslations, getOutlookLanguage } from '../../utils/i18n';
import { generateOutlookTemplateStream, StreamChunk } from '../../services/composeService';
import { API_ENDPOINTS } from '../../config/api';
import TemplateChatInterface from '../NewTemplate';
import EmailContext from '../EmailContext';

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
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  console.log(currentEmail)

  const theme = getTheme();
  
  const cardStyles: IStackStyles = {
    root: {
      backgroundColor: theme.palette.white,
      border: `1px solid ${theme.palette.neutralLight}`,
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '24px 8px',
      marginBottom: '20px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      '@media (max-width: 768px)': {
        padding: '20px 6px',
        borderRadius: '12px'
      },
      '@media (max-width: 480px)': {
        padding: '16px 4px',
        margin: '0 0 16px 0'
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

  // Auto-detect language and set initial values on component mount
  useEffect(() => {
    // Set language based on Outlook settings
    const detectedLang = getOutlookLanguage();
    setLanguage(detectedLang);
    
    // Always set RAG to false initially (will be true in production)
    setUseRag(false);
  }, []);

  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    setIsStreaming(true);
    setError('');
    setSuccess('');
    setGeneratedTemplate(''); // Clear for streaming

    try {
      // Extract main body and conversation history from the email body
      let mainBody = currentEmail?.body || null;
      let conversationHistory = currentEmail?.fullConversation || null;
      
      const requestData = {
        // User Input
        additionalInfo: additionalInfo.trim() || undefined,
        tone: tone,
        language: language,
        use_rag: useRag,
        
        // Email Context
        subject: currentEmail?.subject || undefined,
        from: currentEmail?.from || undefined,
        body: mainBody || undefined,
        conversationHistory: conversationHistory || undefined,
        conversationId: currentEmail?.conversationId || undefined,
        userId: user?.uid
      };
      console.log(requestData.conversationId)

      await generateOutlookTemplateStream(
        requestData,
        (chunk: StreamChunk) => {
          if (chunk.type === 'chunk' && chunk.delta) {
            // Update text incrementally as chunks arrive
            setGeneratedTemplate(prev => prev + chunk.delta);
          } else if (chunk.type === 'done') {
            // Stream complete
            console.log('✅ Template generation complete', chunk.metadata);
            setSuccess('Template generated successfully!');
            // Create new conversation for this template
            setConversationId(Date.now().toString());
          } else if (chunk.type === 'error') {
            setError(chunk.message || 'Failed to generate template');
          }
        }
      );
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
      setIsStreaming(false);
    }
  };

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
            conversationId={conversationId || Date.now().toString()}
            onTemplateUpdate={(newTemplate) => {
              setGeneratedTemplate(newTemplate);
              setSuccess('Template refined successfully!');
            }}
            emailContext={{
              subject: currentEmail?.subject,
              from: currentEmail?.from,
              additionalInfo,
              tone
            }}
            quickActions={[
              { label: 'Répondre', prompt: 'Rédige une réponse professionnelle à cet email.' },
              { label: 'Corriger', prompt: 'Corrige les fautes et améliore la formulation de ce message.' },
              { label: 'Reformuler', prompt: 'Reformule ce texte avec un ton plus fluide et naturel.' },
              { label: 'Synthétiser', prompt: 'Synthétiser le contenu de l’email principal.', email: true, attachment: [
                  { name: 'Document 1.pdf', id: 'att1' },
                  { name: 'Document 2.docx', id: 'att2' }
                ]
              }
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
                setConversationId(null);
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
