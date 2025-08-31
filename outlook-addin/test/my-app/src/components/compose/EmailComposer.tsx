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
  DefaultButton
} from '@fluentui/react';
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
      setStatusMessage({
        message: 'Contenu de l\'email actualisé avec succès',
        type: MessageBarType.success
      });
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

  const cardStyles: IStackStyles = {
    root: {
      backgroundColor: '#ffffff',
      border: '1px solid #e1e5e9',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '20px',
      marginBottom: '16px'
    }
  };

  const insertIntoOutlookWithStatus = async (text: string) => {
    try {
      await insertContentIntoOutlook(text);
      setStatusMessage({
        message: 'Contenu inséré dans Outlook avec succès !',
        type: MessageBarType.success
      });
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
          setStatusMessage({
            message: 'Template raffiné avec succès!',
            type: MessageBarType.success
          });
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
        <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            ✨ Générer un Email
          </Text>
          
          <TextField
            label="Description de l'email *"
            value={description}
            onChange={(_, newValue) => setDescription(newValue || '')}
            placeholder="Décrivez l'email que vous souhaitez générer..."
            multiline
            rows={4}
            required
          />
          
          <Dropdown
            label="Ton"
            selectedKey={selectedTone}
            onChange={(_, option) => option && setSelectedTone(option.key as string)}
            options={toneOptions}
          />
          
          <PrimaryButton
            text="✨ Générer Email"
            onClick={handleGenerateEmail}
            disabled={isLoading || !description.trim()}
          />
        </Stack>
      )}
      
      {hasGenerated.generate && (
        <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              ✨ Email Généré
            </Text>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <PrimaryButton
                text="📧 Insérer dans Outlook"
                onClick={() => insertIntoOutlookWithStatus(lastGeneratedText)}
                disabled={isLoading || !lastGeneratedText}
              />
              <DefaultButton
                text="Nouveau"
                onClick={() => {
                  setHasGenerated(prev => ({ ...prev, generate: false }));
                  setShowChat(prev => ({ ...prev, generate: false }));
                  setLastGeneratedText('');
                  setDescription('');
                }}
                iconProps={{ iconName: 'Add' }}
              />
            </Stack>
          </Stack>
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
        <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            ✅ Corriger un Email
          </Text>
          
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
              Le texte actuel de votre email Outlook (actualisé automatiquement) :
            </Text>
          </Stack>
          
          <TextField
            label="Texte actuel dans Outlook"
            value={currentEmailBody}
            onChange={(_, newValue) => setCurrentEmailBody(newValue || '')}
            placeholder="Le contenu de votre email apparaîtra ici automatiquement..."
            multiline
            rows={6}
            styles={{
              field: {
                backgroundColor: '#f8f9fa',
                border: '1px solid #e1e5e9'
              }
            }}
          />

          <PrimaryButton
            text="✅ Corriger Email"
            onClick={handleCorrectEmail}
            disabled={isLoading || !currentEmailBody.trim()}
          />
        </Stack>
      )}
      
      {hasGenerated.correct && (
        <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              ✅ Email Corrigé
            </Text>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <PrimaryButton
                text="📧 Insérer dans Outlook"
                onClick={() => insertIntoOutlookWithStatus(lastGeneratedText)}
                disabled={isLoading || !lastGeneratedText}
              />
              <DefaultButton
                text="Nouveau"
                onClick={() => {
                  setHasGenerated(prev => ({ ...prev, correct: false }));
                  setShowChat(prev => ({ ...prev, correct: false }));
                  setLastGeneratedText('');
                }}
                iconProps={{ iconName: 'Add' }}
              />
            </Stack>
          </Stack>
        </Stack>
      )}
      
      {renderChatInterface('correct')}
    </Stack>
  );

  const renderReformulateTab = () => (
    <Stack tokens={{ childrenGap: 16 }}>
      {!hasGenerated.reformulate && (
        <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            🔄 Reformuler un Email
          </Text>
          
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
              Le texte actuel de votre email Outlook (actualisé automatiquement) :
            </Text>
          </Stack>
          
          <TextField
            label="Texte actuel dans Outlook"
            value={currentEmailBody}
            onChange={(_, newValue) => setCurrentEmailBody(newValue || '')}
            placeholder="Le contenu de votre email apparaîtra ici automatiquement..."
            multiline
            rows={5}
            styles={{
              field: {
                backgroundColor: '#f8f9fa',
                border: '1px solid #e1e5e9'
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
          />

          <PrimaryButton
            text="🔄 Reformuler Email"
            onClick={handleReformulateEmail}
            disabled={isLoading || !currentEmailBody.trim()}
          />
        </Stack>
      )}
      
      {hasGenerated.reformulate && (
        <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              🔄 Email Reformulé
            </Text>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <PrimaryButton
                text="📧 Insérer dans Outlook"
                onClick={() => insertIntoOutlookWithStatus(lastGeneratedText)}
                disabled={isLoading || !lastGeneratedText}
              />
              <DefaultButton
                text="Nouveau"
                onClick={() => {
                  setHasGenerated(prev => ({ ...prev, reformulate: false }));
                  setShowChat(prev => ({ ...prev, reformulate: false }));
                  setLastGeneratedText('');
                  setReformulateInstructions('');
                }}
                iconProps={{ iconName: 'Add' }}
              />
            </Stack>
          </Stack>
        </Stack>
      )}
      
      {renderChatInterface('reformulate')}
    </Stack>
  );

  if (!user) return null;

  return (
    <Stack styles={{ root: { height: '100%', padding: '16px' } }} tokens={{ childrenGap: 16 }}>
      {statusMessage && (
        <MessageBar 
          messageBarType={statusMessage.type}
          onDismiss={() => setStatusMessage(null)}
          dismissButtonAriaLabel="Fermer"
        >
          {statusMessage.message}
        </MessageBar>
      )}

      {isLoading && (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { padding: '8px' } }}>
          <Spinner size={SpinnerSize.small} />
          <Text>Traitement en cours...</Text>
        </Stack>
      )}

      <Pivot 
        selectedKey={activeTab} 
        onLinkClick={(item) => item?.props.itemKey && setActiveTab(item.props.itemKey)}
        styles={{ root: { marginBottom: '16px' } }}
      >
        <PivotItem headerText="📝 Générer" itemKey="generate">
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
