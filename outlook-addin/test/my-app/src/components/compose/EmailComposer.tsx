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
  IStackStyles
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
  
  // Utility function to format text for display
  const formatTextForDisplay = (text: string): string => {
    if (showFormattedPreview) {
      return processEscapeSequences(text);
    }
    return text;
  };

  // Load email content for correct/reformulate tabs
  useEffect(() => {
    if (activeTab === 'correct' || activeTab === 'reformulate') {
      getCurrentEmailContent()
        .then(content => {
          setCurrentEmailBody(content);
        })
        .catch(error => {
          console.warn('Could not load email content:', error);
          setStatusMessage({
            message: 'Impossible de charger le contenu de l\'email depuis Outlook',
            type: MessageBarType.warning
          });
        });
    }
  }, [activeTab]);

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
      
      // Insert directly into Outlook
      await insertIntoOutlookWithStatus(generatedText);

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
      
      // Insert corrected text back into Outlook
      await insertIntoOutlookWithStatus(correctedText);

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
      
      // Insert reformulated text back into Outlook
      await insertIntoOutlookWithStatus(reformulatedText);

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
          text="✨ Générer et Insérer dans Outlook"
          onClick={handleGenerateEmail}
          disabled={isLoading || !description.trim()}
        />
      </Stack>
      
      {/* Preview Section */}
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
      )}
    </Stack>
  );

  const renderCorrectTab = () => (
    <Stack tokens={{ childrenGap: 16 }}>
      <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          ✅ Corriger un Email
        </Text>
        
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          Le texte actuel de votre email Outlook sera automatiquement chargé ci-dessous :
        </Text>
        
        <TextField
          label="Texte actuel dans Outlook"
          value={currentEmailBody}
          onChange={(_, newValue) => setCurrentEmailBody(newValue || '')}
          placeholder="Le contenu de votre email apparaîtra ici automatiquement..."
          multiline
          rows={6}
          readOnly
          styles={{
            field: {
              backgroundColor: '#f8f9fa',
              border: '1px solid #e1e5e9'
            }
          }}
        />

        <PrimaryButton
          text="✅ Corriger et Insérer dans Outlook"
          onClick={handleCorrectEmail}
          disabled={isLoading || !currentEmailBody.trim()}
        />
      </Stack>
    </Stack>
  );

  const renderReformulateTab = () => (
    <Stack tokens={{ childrenGap: 16 }}>
      <Stack tokens={{ childrenGap: 12 }} styles={cardStyles}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          🔄 Reformuler un Email
        </Text>
        
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          Le texte actuel de votre email Outlook sera automatiquement chargé ci-dessous :
        </Text>
        
        <TextField
          label="Texte actuel dans Outlook"
          value={currentEmailBody}
          onChange={(_, newValue) => setCurrentEmailBody(newValue || '')}
          placeholder="Le contenu de votre email apparaîtra ici automatiquement..."
          multiline
          rows={5}
          readOnly
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
          text="🔄 Reformuler et Insérer dans Outlook"
          onClick={handleReformulateEmail}
          disabled={isLoading || !currentEmailBody.trim()}
        />
      </Stack>
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
