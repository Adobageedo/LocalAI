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
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{message: string, type: MessageBarType} | null>(null);
  
  // Generate email states
  const [description, setDescription] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  
  // Auto-detected language (no user selection needed)
  const detectedLanguage = getOutlookLanguage();
  
  // Correct/Reformulate states
  const [currentEmailBody, setCurrentEmailBody] = useState('');
  const [reformulateInstructions, setReformulateInstructions] = useState('');
  
  // Preview states for formatted text
  const [showFormattedPreview, setShowFormattedPreview] = useState(false);
  const [lastGeneratedText, setLastGeneratedText] = useState('');
  const [showPreview, setShowPreview] = useState<{[key: string]: boolean}>({
    generate: false,
    correct: false,
    reformulate: false
  });
  
  // Chat states for conversational refinement
  const [showChat, setShowChat] = useState<{[key: string]: boolean}>({
    generate: false,
    correct: false,
    reformulate: false
  });
  const [conversationIds, setConversationIds] = useState<{[key: string]: string}>({});
  const [hasGenerated, setHasGenerated] = useState<{[key: string]: boolean}>({
    generate: false,
    correct: false,
    reformulate: false
  });
  
  // Utility function to format text for display
  const formatTextForDisplay = (text: string): string => {
    if (showFormattedPreview) {
      return processEscapeSequences(text);
    }
    return text;
  };

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

  useEffect(() => {
    if (activeTab === 'correct' || activeTab === 'reformulate') {
      refreshEmailContent();
    }
  }, [activeTab]);

  // Auto-refresh email content every 5 seconds when on correct/reformulate tabs
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if ((activeTab === 'correct' || activeTab === 'reformulate') && !hasGenerated[activeTab]) {
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
  }, [activeTab, currentEmailBody, hasGenerated]);

  const toneOptions: IDropdownOption[] = [
    { key: 'professional', text: 'Professionnel' },
    { key: 'friendly', text: 'Amical' },
    { key: 'formal', text: 'Formel' },
    { key: 'casual', text: 'Décontracté' },
    { key: 'urgent', text: 'Urgent' },
    { key: 'apologetic', text: 'Excuses' },
  ];

  const languageOptions: IDropdownOption[] = [
    { key: 'fr', text: 'Français' },
    { key: 'en', text: 'English' },
    { key: 'es', text: 'Español' },
    { key: 'de', text: 'Deutsch' },
    { key: 'it', text: 'Italiano' },
    { key: 'pt', text: 'Português' },
    { key: 'nl', text: 'Nederlands' },
    { key: 'ru', text: 'Русский' },
    { key: 'ja', text: '日本語' },
    { key: 'zh', text: '中文' },
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

  const insertIntoOutlookWithStatus = async (text: string) => {
    try {
      await insertContentIntoOutlook(text);
    } catch (error) {
      console.error('Failed to insert into Outlook:', error);
      setStatusMessage({
        message: 'Erreur lors de l\'insertion dans Outlook',
        type: MessageBarType.error
      });
    }
  };

  // Get conversation ID for a tab
  const getConversationId = (tabKey: string) => {
    if (!conversationIds[tabKey]) {
      const newId = Date.now().toString();
      setConversationIds(prev => ({ ...prev, [tabKey]: newId }));
      return newId;
    }
    return conversationIds[tabKey];
  };

  const toggleChat = (tabKey: string) => {
    setShowChat(prev => ({ ...prev, [tabKey]: !prev[tabKey] }));
  };

  const renderChatInterface = (tabKey: string) => {
    if (!showChat[tabKey]) return null;

    return (
      <TemplateChatInterface
        initialTemplate={lastGeneratedText}
        conversationId={getConversationId(tabKey)}
        onTemplateUpdate={(newTemplate) => {
          setLastGeneratedText(newTemplate);
        }}
        isInline={true}
        userRequest={`Refine the ${tabKey} email content`}
        emailContext={{
          subject: '',
          from: getUserEmailFromOutlook() || user?.email || '',
          additionalInfo: tabKey === 'generate' ? description : reformulateInstructions,
          tone: selectedTone
        }}
      />
    );
  };

  const handleGenerateEmail = async () => {
    if (!description.trim()) {
      setStatusMessage({
        message: 'Veuillez décrire l\'email que vous souhaitez générer',
        type: MessageBarType.error
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await generateEmail({
        additionalInfo: description,
        tone: selectedTone,
        language: detectedLanguage,
        userId: user?.uid || 'compose-user',
        from: getUserEmailFromOutlook() || user?.email || ''
      });

      const generatedText = response.generated_text;
      
      // Save for preview
      setLastGeneratedText(generatedText);
      
      // Mark as generated and show chat
      setHasGenerated(prev => ({ ...prev, generate: true }));
      setShowChat(prev => ({ ...prev, generate: true }));

    } catch (error) {
      console.error('Generate email failed:', error);
      setStatusMessage({
        message: 'Erreur lors de la génération de l\'email. Veuillez réessayer.',
        type: MessageBarType.error
      });
    } finally {
      setIsLoading(false);
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
    setStatusMessage(null);

    try {
      const response = await correctEmail({
        body: currentEmailBody,
        language: detectedLanguage,
        userId: user?.uid || 'compose-user'
      });

      const correctedText = response.generated_text;
      setLastGeneratedText(correctedText);
      
      // Mark as generated and show chat
      setHasGenerated(prev => ({ ...prev, correct: true }));
      setShowChat(prev => ({ ...prev, correct: true }));

    } catch (error) {
      console.error('Correct email failed:', error);
      setStatusMessage({
        message: 'Erreur lors de la correction. Veuillez réessayer.',
        type: MessageBarType.error
      });
    } finally {
      setIsLoading(false);
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
    setStatusMessage(null);

    try {
      const response = await reformulateEmail({
        body: currentEmailBody,
        additionalInfo: reformulateInstructions || 'Améliorer la clarté, le style et la fluidité tout en conservant le sens original.',
        tone: selectedTone,
        language: detectedLanguage,
        userId: user?.uid || 'compose-user'
      });

      const reformulatedText = response.generated_text;
      setLastGeneratedText(reformulatedText);
      
      // Mark as generated and show chat
      setHasGenerated(prev => ({ ...prev, reformulate: true }));
      setShowChat(prev => ({ ...prev, reformulate: true }));

    } catch (error) {
      console.error('Reformulate email failed:', error);
      setStatusMessage({
        message: 'Erreur lors de la reformulation. Veuillez réessayer.',
        type: MessageBarType.error
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderGenerateTab = () => (
    <Stack tokens={{ childrenGap: 16 }}>
      {!hasGenerated.generate && (
        <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
          <Text className={headerStyles}>
            <Sparkle24Regular /> Générer un Email
          </Text>
          <Text className={subHeaderStyles}>
            Décrivez le type d'email que vous souhaitez créer et choisissez le ton approprié.
          </Text>
          
          <TextField
            label="Description de l'email *"
            value={description}
            onChange={(_, newValue) => setDescription(newValue || '')}
            placeholder="Décrivez l'email que vous souhaitez générer..."
            multiline
            rows={4}
            required
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
          
          <PrimaryButton
            text="Générer Email"
            onClick={handleGenerateEmail}
            disabled={isLoading || !description.trim()}
            iconProps={{ iconName: 'Sparkle' }}
            styles={modernButtonStyles}
          />
        </Stack>
      )}
      
      {hasGenerated.generate && (
        <Stack tokens={{ childrenGap: 16 }}>
          <Stack tokens={{ childrenGap: 12 }} styles={successCardStyles}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text className={headerStyles}>
                <CheckmarkCircle24Regular style={{ color: theme.palette.green }} /> Email Généré
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
                  text={showPreview.generate ? "Masquer l'aperçu" : "Voir l'aperçu"}
                  onClick={() => setShowPreview(prev => ({ ...prev, generate: !prev.generate }))}
                  iconProps={{ iconName: showPreview.generate ? 'Hide' : 'View' }}
                  styles={secondaryButtonStyles}
                />
                <PrimaryButton
                  text="Insérer dans Outlook"
                  onClick={() => insertIntoOutlookWithStatus(lastGeneratedText)}
                  disabled={isLoading || !lastGeneratedText}
                  iconProps={{ iconName: 'Mail' }}
                  styles={modernButtonStyles}
                />
                <DefaultButton
                  text="Nouveau"
                  onClick={() => {
                    setHasGenerated(prev => ({ ...prev, generate: false }));
                    setShowChat(prev => ({ ...prev, generate: false }));
                    setShowPreview(prev => ({ ...prev, generate: false }));
                    setLastGeneratedText('');
                    setDescription('');
                  }}
                  iconProps={{ iconName: 'Add' }}
                  styles={secondaryButtonStyles}
                />
              </Stack>
            </Stack>
          </Stack>
          
          {showPreview.generate && lastGeneratedText && (
            <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text className={headerStyles}>
                  <Eye24Regular /> Aperçu du Contenu Généré
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
              
              <TextField
                value={showFormattedPreview ? processEscapeSequences(lastGeneratedText) : lastGeneratedText}
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
            </Stack>
          )}
        </Stack>
      )}
      
      {/* Preview Section
      {lastGeneratedText && (
        <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              📄 Aperçu du Dernier Email Généré
            </Text>
            <IconButton
              iconProps={{ iconName: showFormattedPreview ? 'Code' : 'Preview' }}
              title={showFormattedPreview ? 'Voir le texte brut' : 'Voir le texte formaté'}
              onClick={() => setShowFormattedPreview(!showFormattedPreview)}
            />
          </Stack>
          
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            {showFormattedPreview ? 
              'Aperçu formaté (séquences d\'échappement converties) :' : 
              'Texte brut (avec séquences d\'échappement) :'
            }
          </Text>
          
          <TextField
            value={formatTextForDisplay(lastGeneratedText)}
            multiline
            rows={8}
            readOnly
            styles={{
              field: {
                backgroundColor: '#f8f9fa',
                border: '1px solid #e1e5e9',
                fontFamily: showFormattedPreview ? 'inherit' : 'monospace',
                whiteSpace: showFormattedPreview ? 'pre-wrap' : 'pre'
              }
            }}
          />
          
          <PrimaryButton
            text="🔄 Réinsérer dans Outlook"
            onClick={() => insertIntoOutlookWithStatus(lastGeneratedText)}
            disabled={isLoading}
          />
        </Stack>
      )} */}
      
      {renderChatInterface('generate')}
    </Stack>
  );

  const renderCorrectTab = () => (
    <Stack tokens={{ childrenGap: 16 }}>
      {!hasGenerated.correct && (
        <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
          <Text className={headerStyles}>
            <CheckmarkCircle24Regular /> Corriger un Email
          </Text>
          <Text className={subHeaderStyles}>
            Corrigez automatiquement la grammaire, l'orthographe et le style de votre email.
          </Text>
                    
          <TextField
            label="Texte actuel dans Outlook"
            value={currentEmailBody}
            onChange={(_, newValue) => setCurrentEmailBody(newValue || '')}
            placeholder="Le contenu de votre email apparaîtra ici automatiquement..."
            multiline
            rows={6}
            styles={{
              ...textFieldStyles,
              field: {
                ...textFieldStyles.field,
                backgroundColor: '#f8f9fa'
              }
            }}
          />

          <PrimaryButton
            text="Corriger Email"
            onClick={handleCorrectEmail}
            disabled={isLoading || !currentEmailBody.trim()}
            iconProps={{ iconName: 'CheckMark' }}
            styles={modernButtonStyles}
          />
        </Stack>
      )}
      
      {hasGenerated.correct && (
        <Stack tokens={{ childrenGap: 16 }}>
          <Stack tokens={{ childrenGap: 12 }} styles={successCardStyles}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text className={headerStyles}>
                <CheckmarkCircle24Regular style={{ color: theme.palette.green }} /> Email Corrigé
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
                  text={showPreview.correct ? "Masquer l'aperçu" : "Voir l'aperçu"}
                  onClick={() => setShowPreview(prev => ({ ...prev, correct: !prev.correct }))}
                  iconProps={{ iconName: showPreview.correct ? 'Hide' : 'View' }}
                  styles={secondaryButtonStyles}
                />
                <PrimaryButton
                  text="Insérer dans Outlook"
                  onClick={() => insertIntoOutlookWithStatus(lastGeneratedText)}
                  disabled={isLoading || !lastGeneratedText}
                  iconProps={{ iconName: 'Mail' }}
                  styles={modernButtonStyles}
                />
                <DefaultButton
                  text="Nouveau"
                  onClick={() => {
                    setHasGenerated(prev => ({ ...prev, correct: false }));
                    setShowChat(prev => ({ ...prev, correct: false }));
                    setShowPreview(prev => ({ ...prev, correct: false }));
                    setLastGeneratedText('');
                  }}
                  iconProps={{ iconName: 'Add' }}
                  styles={secondaryButtonStyles}
                />
              </Stack>
            </Stack>
          </Stack>
          
          {showPreview.correct && lastGeneratedText && (
            <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text className={headerStyles}>
                  <Eye24Regular /> Aperçu du Contenu Corrigé
                </Text>
                <IconButton
                  iconProps={{ iconName: showFormattedPreview ? 'Code' : 'Preview' }}
                  title={showFormattedPreview ? 'Voir le texte brut' : 'Voir le texte formaté'}
                  onClick={() => setShowFormattedPreview(!showFormattedPreview)}
                  styles={{ root: { borderRadius: '8px' } }}
                />
              </Stack>
              
              <TextField
                value={showFormattedPreview ? processEscapeSequences(lastGeneratedText) : lastGeneratedText}
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
            </Stack>
          )}
        </Stack>
      )}
      
      {renderChatInterface('correct')}
    </Stack>
  );

  const renderReformulateTab = () => (
    <Stack tokens={{ childrenGap: 16 }}>
      {!hasGenerated.reformulate && (
        <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
          <Text className={headerStyles}>
            <ArrowSync24Regular /> Reformuler un Email
          </Text>
          <Text className={subHeaderStyles}>
            Reformulez votre email pour améliorer la clarté, le style et l'impact.
          </Text>
                    
          <TextField
            label="Texte actuel dans Outlook"
            value={currentEmailBody}
            onChange={(_, newValue) => setCurrentEmailBody(newValue || '')}
            placeholder="Le contenu de votre email apparaîtra ici automatiquement..."
            multiline
            rows={5}
            styles={{
              ...textFieldStyles,
              field: {
                ...textFieldStyles.field,
                backgroundColor: '#f8f9fa'
              }
            }}
          />

          <TextField
            label="Instructions de reformulation (optionnel)"
            value={reformulateInstructions}
            onChange={(_, newValue) => setReformulateInstructions(newValue || '')}
            placeholder="Ex: Rendre plus formel, plus concis, plus amical..."
            multiline
            rows={2}
            styles={textFieldStyles}
          />

          <PrimaryButton
            text="Reformuler Email"
            onClick={handleReformulateEmail}
            disabled={isLoading || !currentEmailBody.trim()}
            iconProps={{ iconName: 'Sync' }}
            styles={modernButtonStyles}
          />
        </Stack>
      )}
      
      {hasGenerated.reformulate && (
        <Stack tokens={{ childrenGap: 16 }}>
          <Stack tokens={{ childrenGap: 12 }} styles={successCardStyles}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text className={headerStyles}>
                <CheckmarkCircle24Regular style={{ color: theme.palette.green }} /> Email Reformulé
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
                  text={showPreview.reformulate ? "Masquer l'aperçu" : "Voir l'aperçu"}
                  onClick={() => setShowPreview(prev => ({ ...prev, reformulate: !prev.reformulate }))}
                  iconProps={{ iconName: showPreview.reformulate ? 'Hide' : 'View' }}
                  styles={secondaryButtonStyles}
                />
                <PrimaryButton
                  text="Insérer dans Outlook"
                  onClick={() => insertIntoOutlookWithStatus(lastGeneratedText)}
                  disabled={isLoading || !lastGeneratedText}
                  iconProps={{ iconName: 'Mail' }}
                  styles={modernButtonStyles}
                />
                <DefaultButton
                  text="Nouveau"
                  onClick={() => {
                    setHasGenerated(prev => ({ ...prev, reformulate: false }));
                    setShowChat(prev => ({ ...prev, reformulate: false }));
                    setShowPreview(prev => ({ ...prev, reformulate: false }));
                    setLastGeneratedText('');
                    setReformulateInstructions('');
                  }}
                  iconProps={{ iconName: 'Add' }}
                  styles={secondaryButtonStyles}
                />
              </Stack>
            </Stack>
          </Stack>
          
          {showPreview.reformulate && lastGeneratedText && (
            <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text className={headerStyles}>
                  <Eye24Regular /> Aperçu du Contenu Reformulé
                </Text>
                <IconButton
                  iconProps={{ iconName: showFormattedPreview ? 'Code' : 'Preview' }}
                  title={showFormattedPreview ? 'Voir le texte brut' : 'Voir le texte formaté'}
                  onClick={() => setShowFormattedPreview(!showFormattedPreview)}
                  styles={{ root: { borderRadius: '8px' } }}
                />
              </Stack>
              
              <TextField
                value={showFormattedPreview ? processEscapeSequences(lastGeneratedText) : lastGeneratedText}
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
            </Stack>
          )}
        </Stack>
      )}
      
      {renderChatInterface('reformulate')}
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

      <Pivot 
        selectedKey={activeTab} 
        onLinkClick={(item) => item?.props.itemKey && setActiveTab(item.props.itemKey)}
        styles={{ 
          root: { 
            marginBottom: '24px',
            '& .ms-Pivot-link': {
              fontSize: '16px',
              fontWeight: FontWeights.semibold,
              padding: '12px 24px',
              borderRadius: '12px 12px 0 0',
              transition: 'all 0.2s ease-in-out',
              '@media (max-width: 768px)': {
                fontSize: '14px',
                padding: '10px 16px'
              },
              '@media (max-width: 480px)': {
                fontSize: '13px',
                padding: '8px 12px'
              }
            },
            '& .ms-Pivot-link.is-selected': {
              backgroundColor: theme.palette.themePrimary,
              color: theme.palette.white
            }
          }
        }}
      >
        <PivotItem headerText="✨ Générer" itemKey="generate">
          {renderGenerateTab()}
        </PivotItem>
        <PivotItem headerText="✅ Corriger" itemKey="correct">
          {renderCorrectTab()}
        </PivotItem>
        <PivotItem headerText="🔄 Reformuler" itemKey="reformulate">
          {renderReformulateTab()}
        </PivotItem>
      </Pivot>
    </Stack>
  );
};

export default EmailComposer;
