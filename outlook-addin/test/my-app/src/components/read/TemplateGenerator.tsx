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
import { authFetch } from '../../utils/authFetch';
import { API_ENDPOINTS } from '../../config/api';
import TemplateChatInterface from '../TemplateChatInterface';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

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
    setError('');
    setSuccess('');

    try {
      const requestData = {
        // User Input
        additionalInfo: additionalInfo.trim() || null,
        tone: tone,
        language: language,
        use_rag: useRag,
        
        // Email Context
        subject: currentEmail?.subject || null,
        from: currentEmail?.from || null,
        body: currentEmail?.body || null,
        conversationId: currentEmail?.conversationId || null
      };

      // Log the data being sent to API
      console.log('=== API REQUEST DATA ===');
      console.log('Additional Info:', requestData.additionalInfo);
      console.log('Tone:', requestData.tone);
      console.log('Language:', requestData.language);
      console.log('Use RAG:', requestData.use_rag);
      console.log('Subject:', requestData.subject);
      console.log('From:', requestData.from);
      console.log('Body Length:', requestData.body?.length || 0);
      console.log('Body Preview:', requestData.body?.substring(0, 200) + '...');
      console.log('Conversation ID:', requestData.conversationId);
      
      console.log('Full Request Data:', JSON.stringify(requestData, null, 2));
      console.log('=== END API REQUEST DATA ===');

      const response = await authFetch(API_ENDPOINTS.OUTLOOK_PROMPT, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.generated_text) {
        console.log('=== API RESPONSE DATA ===');
        console.log('Generated Text:', data.generated_text);
        console.log('=== END API RESPONSE DATA ===');
        setGeneratedTemplate(data.generated_text);
        setSuccess('Template generated successfully!');
        // Create new conversation for this template
        setConversationId(Date.now().toString());
      } else {
        throw new Error('Invalid response from API');
      }
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

      {!generatedTemplate && (
        <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
          <Text className={headerStyles}>
            <Sparkle24Regular /> Générer un Template d'Email
          </Text>
          <Text className={subHeaderStyles}>
            Créez un template d'email personnalisé basé sur le contexte de l'email actuel.
          </Text>
          
          <TextField
            label={t.additionalInfo}
            multiline
            rows={3}
            value={additionalInfo}
            onChange={(_, newValue) => setAdditionalInfo(newValue || '')}
            placeholder={t.additionalInfoPlaceholder}
            disabled={isGenerating}
            styles={textFieldStyles}
          />

          <Dropdown
            label={t.tone}
            selectedKey={tone}
            onChange={(_, option) => setTone(option?.key as string)}
            options={toneOptions}
            disabled={isGenerating}
            styles={{
              dropdown: { borderRadius: '12px' },
              title: { borderRadius: '12px', border: `2px solid ${theme.palette.neutralLight}` }
            }}
          />

          <PrimaryButton
            text={isGenerating ? t.generatingTemplate : t.generateTemplate}
            onClick={handleGenerateTemplate}
            disabled={isGenerating}
            iconProps={{ iconName: 'Sparkle' }}
            styles={modernButtonStyles}
          />

          {isGenerating && (
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
                {t.generatingTemplate}
              </Text>
            </Stack>
          )}
        </Stack>
      )}

      {generatedTemplate && (
        <Stack tokens={{ childrenGap: 12 }}>          
          <TemplateChatInterface
            initialTemplate={generatedTemplate}
            conversationId={conversationId || Date.now().toString()}
            onTemplateUpdate={(newTemplate) => {
              setGeneratedTemplate(newTemplate);
              setSuccess('Template refined successfully!');
            }}
            isInline={true}
            userRequest={`Please create an email template based on the provided context`}
            emailContext={{
              subject: currentEmail?.subject,
              from: currentEmail?.from,
              additionalInfo: additionalInfo,
              tone: tone
            }}
          />
          <Stack 
            horizontal 
            tokens={{ childrenGap: 12 }} 
            horizontalAlign="space-between"
            wrap
            styles={{
              root: {
                padding: '20px',
                backgroundColor: '#f3f9ff',
                borderRadius: '12px',
                border: `2px solid ${theme.palette.themePrimary}`,
                '@media (max-width: 768px)': {
                  flexDirection: 'column',
                  gap: '12px'
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
            <Stack horizontal tokens={{ childrenGap: 12 }}>
              <PrimaryButton
                text={t.insertTemplate}
                onClick={handleInsertTemplate}
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
