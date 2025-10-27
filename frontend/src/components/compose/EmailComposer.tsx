import React, { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
  Dropdown,
  IDropdownOption,
  Pivot,
  PivotItem,
  IconButton,
  TooltipHost,
  IStackTokens,
  IStackStyles,
  DefaultButton,
  mergeStyles,
  FontWeights,
  getTheme,
  Separator,
  Label
} from '@fluentui/react';
import { 
  Sparkle24Regular, 
  CheckmarkCircle24Regular, 
  ArrowSync24Regular,
  Mail24Regular,
  Add24Regular,
  ArrowClockwise24Regular,
  Eye24Regular,
  Code24Regular
} from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import { 
  generateEmail, 
  correctEmail, 
  reformulateEmail,
  generateEmailStream,
  correctEmailStream,
  reformulateEmailStream,
  StreamChunk,
  getCurrentEmailContent,
  insertContentIntoOutlook,
  getUserEmailFromOutlook,
  processEscapeSequences
} from '../../services/composeService';
import { getOutlookLanguage } from '../../utils/i18n';
import TemplateChatInterface from '../TemplateChatInterface';

const EmailComposer: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{message: string, type: MessageBarType} | null>(null);
  
  // User input states
  const [userComment, setUserComment] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  
  // Auto-detected language (no user selection needed)
  const detectedLanguage = getOutlookLanguage();
  
  // Email content state
  const [currentEmailBody, setCurrentEmailBody] = useState('');
  
  // Result states
  const [showFormattedPreview, setShowFormattedPreview] = useState(false);
  const [lastGeneratedText, setLastGeneratedText] = useState('');
  const [lastOperation, setLastOperation] = useState<'generate' | 'correct' | 'reformulate' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Chat states for conversational refinement
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Load email content for correct/reformulate tabs
  const refreshEmailContent = async () => {
    try {
      const content = await getCurrentEmailContent();
      setCurrentEmailBody(content);
      // Clear success message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.warn('Could not load email content:', error);
      setStatusMessage({
        message: 'Impossible de charger le contenu de l\'email depuis Outlook',
        type: MessageBarType.warning
      });
    }
  };

  // Load email content on component mount
  useEffect(() => {
    refreshEmailContent();
  }, []);

  // Auto-refresh email content every 5 seconds until user generates content
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (!hasGenerated) {
      intervalId = setInterval(() => {
        getCurrentEmailContent()
          .then(content => {
            if (content !== currentEmailBody) {
              setCurrentEmailBody(content);
            }
          })
          .catch(error => {
            console.warn('Auto-refresh failed:', error);
          });
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentEmailBody, hasGenerated]);

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: 'Professionnel' },
    { key: 'friendly', text: 'Amical' },
    { key: 'formal', text: 'Formel' },
    { key: 'casual', text: 'Décontracté' },
    { key: 'urgent', text: 'Urgent' },
    { key: 'apologetic', text: 'Excuses' },
  ];

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
  
  const successCardStyles: IStackStyles = {
    root: {
      backgroundColor: '#f3f9ff',
      border: `2px solid ${theme.palette.themePrimary}`,
      borderRadius: '16px',
      padding: '24px 8px',
      marginBottom: '20px',
      position: 'relative',
      width: '100%',
      '@media (max-width: 768px)': {
        padding: '20px 6px'
      },
      '@media (max-width: 480px)': {
        padding: '16px 4px'
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${theme.palette.green}, ${theme.palette.greenDark})`,
        borderRadius: '16px 16px 0 0'
      }
    }
  };
  
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

  const insertIntoOutlookWithStatus = async (text: string, includeHistory: boolean = true) => {
    try {
      await insertContentIntoOutlook(text, includeHistory);
    } catch (error) {
      console.error('Failed to insert into Outlook:', error);
      setStatusMessage({
        message: 'Erreur lors de l\'insertion dans Outlook',
        type: MessageBarType.error
      });
    }
  };

  // Get or create conversation ID
  const getConversationId = () => {
    if (!conversationId) {
      const newId = Date.now().toString();
      setConversationId(newId);
      return newId;
    }
    return conversationId;
  };

  const renderChatInterface = () => {
    if (!showChat) return null;

    const operationLabel = lastOperation === 'generate' ? 'génération' : 
                           lastOperation === 'correct' ? 'correction' : 'reformulation';

    return (
      <TemplateChatInterface
        initialTemplate={lastGeneratedText}
        conversationId={getConversationId()}
        onTemplateUpdate={(newTemplate) => {
          setLastGeneratedText(newTemplate);
        }}
        isInline={true}
        userRequest={`Affiner le contenu de ${operationLabel} de l'email`}
        emailContext={{
          subject: '',
          from: getUserEmailFromOutlook() || user?.email || '',
          additionalInfo: userComment,
          tone: selectedTone
        }}
      />
    );
  };

  const handleGenerateEmail = async () => {
    setIsLoading(true);
    setIsStreaming(true);
    setStatusMessage(null);
    setLastGeneratedText(''); // Clear for streaming
    setShowPreview(true); // Show preview immediately
    setHasGenerated(true);

    try {
      await generateEmailStream(
        {
          additionalInfo: userComment || 'Générer une réponse appropriée',
          tone: selectedTone,
          language: detectedLanguage,
          userId: user?.uid || 'compose-user',
          from: getUserEmailFromOutlook() || user?.email || '',
          body: currentEmailBody
        },
        (chunk: StreamChunk) => {
          if (chunk.type === 'chunk' && chunk.delta) {
            // Update text incrementally as chunks arrive
            setLastGeneratedText(prev => prev + chunk.delta);
          } else if (chunk.type === 'done') {
            // Stream complete
            console.log('✅ Generation complete', chunk.metadata);
            setLastOperation('generate');
            setShowChat(true);
          } else if (chunk.type === 'error') {
            setStatusMessage({
              message: chunk.message || 'Erreur lors de la génération',
              type: MessageBarType.error
            });
          }
        }
      );

    } catch (error) {
      console.error('Generate email failed:', error);
      setStatusMessage({
        message: 'Erreur lors de la génération de l\'email. Veuillez réessayer.',
        type: MessageBarType.error
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCorrectEmail = async () => {
    if (!currentEmailBody.trim()) {
      setStatusMessage({
        message: 'Aucun texte à corriger trouvé dans Outlook',
        type: MessageBarType.error
      });
      return;
    }

    setIsLoading(true);
    setIsStreaming(true);
    setStatusMessage(null);
    setLastGeneratedText(''); // Clear for streaming
    setShowPreview(true); // Show preview immediately
    setHasGenerated(true);

    try {
      await correctEmailStream(
        {
          body: currentEmailBody,
          language: detectedLanguage,
          userId: user?.uid || 'compose-user',
          additionalInfo: userComment
        },
        (chunk: StreamChunk) => {
          if (chunk.type === 'chunk' && chunk.delta) {
            // Update text incrementally as chunks arrive
            setLastGeneratedText(prev => prev + chunk.delta);
          } else if (chunk.type === 'done') {
            // Stream complete
            console.log('✅ Correction complete', chunk.metadata);
            setLastOperation('correct');
            setShowChat(true);
          } else if (chunk.type === 'error') {
            setStatusMessage({
              message: chunk.message || 'Erreur lors de la correction',
              type: MessageBarType.error
            });
          }
        }
      );

    } catch (error) {
      console.error('Correct email failed:', error);
      setStatusMessage({
        message: 'Erreur lors de la correction. Veuillez réessayer.',
        type: MessageBarType.error
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleReformulateEmail = async () => {
    if (!currentEmailBody.trim()) {
      setStatusMessage({
        message: 'Aucun texte à reformuler trouvé dans Outlook',
        type: MessageBarType.error
      });
      return;
    }

    setIsLoading(true);
    setIsStreaming(true);
    setStatusMessage(null);
    setLastGeneratedText(''); // Clear for streaming
    setShowPreview(true); // Show preview immediately
    setHasGenerated(true);

    try {
      await reformulateEmailStream(
        {
          body: currentEmailBody,
          additionalInfo: userComment || 'Améliorer la clarté, le style et la fluidité tout en conservant le sens original.',
          tone: selectedTone,
          language: detectedLanguage,
          userId: user?.uid || 'compose-user'
        },
        (chunk: StreamChunk) => {
          if (chunk.type === 'chunk' && chunk.delta) {
            // Update text incrementally as chunks arrive
            setLastGeneratedText(prev => prev + chunk.delta);
          } else if (chunk.type === 'done') {
            // Stream complete
            console.log('✅ Reformulation complete', chunk.metadata);
            setLastOperation('reformulate');
            setShowChat(true);
          } else if (chunk.type === 'error') {
            setStatusMessage({
              message: chunk.message || 'Erreur lors de la reformulation',
              type: MessageBarType.error
            });
          }
        }
      );

    } catch (error) {
      console.error('Reformulate email failed:', error);
      setStatusMessage({
        message: 'Erreur lors de la reformulation. Veuillez réessayer.',
        type: MessageBarType.error
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Main content before results
  const renderInputSection = () => (
    <Stack tokens={{ childrenGap: 16 }}>
      {!hasGenerated && (
        <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
          <Text className={headerStyles}>
            <Sparkle24Regular /> Améliorer ou Générer un Email
          </Text>
          <Text className={subHeaderStyles}>
            Améliorez le contenu existant ou décrivez un nouvel email à générer.
          </Text>
          
          <TextField
            label="Commentaire (optionnel)"
            value={userComment}
            onChange={(_, newValue) => setUserComment(newValue || '')}
            placeholder="Ajoutez des instructions ou commentaires pour guider l'IA..."
            multiline
            rows={3}
            styles={textFieldStyles}
          />
          
          <Dropdown
            label="Ton"
            selectedKey={selectedTone}
            onChange={(_, option) => option && setSelectedTone(option.key as string)}
            options={toneOptions}
            styles={{
              dropdown: { borderRadius: '12px' },
              title: { borderRadius: '12px', border: `2px solid ${theme.palette.neutralLight}` }
            }}
          />
          
          <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
            <PrimaryButton
              text="✅ Corriger"
              onClick={handleCorrectEmail}
              disabled={isLoading || !currentEmailBody.trim()}
              iconProps={{ iconName: 'CheckMark' }}
              styles={modernButtonStyles}
            />
            <PrimaryButton
              text="🔄 Reformuler"
              onClick={handleReformulateEmail}
              disabled={isLoading || !currentEmailBody.trim()}
              iconProps={{ iconName: 'Sync' }}
              styles={modernButtonStyles}
            />
            <PrimaryButton
              text="✨ Générer Réponse"
              onClick={handleGenerateEmail}
              disabled={isLoading}
              iconProps={{ iconName: 'Sparkle' }}
              styles={modernButtonStyles}
            />
          </Stack>
        </Stack>
      )}
      
      {hasGenerated && (
        <Stack tokens={{ childrenGap: 16 }}>
          <Stack tokens={{ childrenGap: 12 }} styles={successCardStyles}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text className={headerStyles}>
                <CheckmarkCircle24Regular style={{ color: theme.palette.green }} /> 
                {lastOperation === 'generate' ? 'Email Généré' : 
                 lastOperation === 'correct' ? 'Email Corrigé' : 'Email Reformulé'}
              </Text>
              <Stack horizontal tokens={{ childrenGap: 12 }} wrap styles={{
                root: {
                  '@media (max-width: 768px)': {
                    flexDirection: 'column',
                    gap: '8px'
                  }
                }
              }}>
                <DefaultButton
                  text={showPreview ? "Masquer l'aperçu" : "Voir l'aperçu"}
                  onClick={() => setShowPreview(!showPreview)}
                  iconProps={{ iconName: showPreview ? 'Hide' : 'View' }}
                  styles={secondaryButtonStyles}
                />
                <PrimaryButton
                  text="Insérer dans Outlook"
                  onClick={() => insertIntoOutlookWithStatus(lastGeneratedText, true)}
                  disabled={isLoading || !lastGeneratedText}
                  iconProps={{ iconName: 'Mail' }}
                  styles={modernButtonStyles}
                />
                <DefaultButton
                  text="Nouveau"
                  onClick={() => {
                    setHasGenerated(false);
                    setShowChat(false);
                    setShowPreview(false);
                    setLastGeneratedText('');
                    setLastOperation(null);
                    setUserComment('');
                  }}
                  iconProps={{ iconName: 'Add' }}
                  styles={secondaryButtonStyles}
                />
              </Stack>
            </Stack>
          </Stack>
          
          {showPreview && (lastGeneratedText || isStreaming) && (
            <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text className={headerStyles}>
                  <Eye24Regular /> Aperçu du Contenu
                  {isStreaming && <Spinner size={SpinnerSize.small} style={{ marginLeft: '8px' }} />}
                </Text>
                <IconButton
                  iconProps={{ iconName: showFormattedPreview ? 'Code' : 'Preview' }}
                  title={showFormattedPreview ? 'Voir le texte brut' : 'Voir le texte formaté'}
                  onClick={() => setShowFormattedPreview(!showFormattedPreview)}
                  styles={{ root: { borderRadius: '8px' } }}
                />
              </Stack>
              
              <Text variant="small" styles={{ root: { color: theme.palette.neutralSecondary, marginBottom: '8px' } }}>
                {showFormattedPreview ? 
                  'Aperçu formaté (séquences d\'\u00e9chappement converties) :' : 
                  'Texte brut (avec séquences d\'\u00e9chappement) :'
                }
              </Text>
              
              <div style={{ position: 'relative' }}>
                <TextField
                  value={(showFormattedPreview ? processEscapeSequences(lastGeneratedText) : lastGeneratedText) + (isStreaming ? ' ▌' : '')}
                  multiline
                  rows={8}
                  readOnly
                  styles={{
                    ...textFieldStyles,
                    field: {
                      ...textFieldStyles.field,
                      backgroundColor: '#f8f9fa',
                      fontFamily: showFormattedPreview ? 'inherit' : 'monospace',
                      whiteSpace: showFormattedPreview ? 'pre-wrap' : 'pre',
                      fontSize: '13px'
                    }
                  }}
                />
                {isStreaming && (
                  <style>{`
                    @keyframes blink-cursor {
                      0%, 49% { opacity: 1; }
                      50%, 100% { opacity: 0; }
                    }
                  `}</style>
                )}
              </div>
            </Stack>
          )}
        </Stack>
      )}
      
      {renderChatInterface()}
    </Stack>
  );

  if (!user) return null;

  return (
    <Stack styles={{ 
      root: { 
        height: '100%', 
        padding: '8px 4px', 
        backgroundColor: '#fafbfc',
        minHeight: '100vh',
        width: '100%',
        '@media (max-width: 768px)': {
          padding: '6px 2px'
        },
        '@media (max-width: 480px)': {
          padding: '4px 0px'
        }
      } 
    }} tokens={{ childrenGap: 24 }}>
      {statusMessage && (
        <MessageBar 
          messageBarType={statusMessage.type}
          onDismiss={() => setStatusMessage(null)}
          dismissButtonAriaLabel="Fermer"
          styles={{
            root: {
              borderRadius: '12px',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: FontWeights.regular
            }
          }}
        >
          {statusMessage.message}
        </MessageBar>
      )}

      {isLoading && (
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
              marginBottom: '16px'
            } 
          }}
        >
          <Spinner size={SpinnerSize.medium} styles={{ circle: { borderTopColor: theme.palette.themePrimary } }} />
          <Text styles={{ root: { fontSize: '16px', fontWeight: FontWeights.semibold, color: theme.palette.themePrimary } }}>
            Traitement en cours...
          </Text>
        </Stack>
      )}

      {renderInputSection()}
    </Stack>
  );
};

export default EmailComposer;
