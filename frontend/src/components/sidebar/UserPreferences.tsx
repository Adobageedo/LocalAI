import React, { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Toggle,
  Dropdown,
  IDropdownOption,
  TextField,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  Separator,
  IconButton,
  Spinner,
  SpinnerSize,
  FontWeights,
  useTheme,
  mergeStyleSets
} from '@fluentui/react';
import {
  Settings24Regular,
  Person24Regular,
  Globe24Regular,
  Mail24Regular,
  DocumentText24Regular,
  VideoChat24Regular,
  BrainCircuit24Regular
} from '@fluentui/react-icons';
import { UserPreferencesService, UserPreferences, UserProfile, UpdateUserPreferencesRequest, UpdateUserProfileRequest } from '../../services/userPreferencesService';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/authFetch';
import { API_ENDPOINTS } from '../../config/api';

interface UserPreferencesProps {
  onClose?: () => void;
}

const UserPreferencesComponent: React.FC<UserPreferencesProps> = ({ onClose }) => {
  const { user } = useAuth();
  const theme = useTheme();

  // State management
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: MessageBarType; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const styles = mergeStyleSets({
    container: {
      padding: '24px',
      backgroundColor: theme.palette.white,
      borderRadius: '16px',
      border: `1px solid ${theme.palette.neutralLight}`,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        transform: 'translateY(-1px)'
      }
    },
    header: {
      fontSize: '20px',
      fontWeight: FontWeights.semibold,
      color: theme.palette.themePrimary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    sectionHeader: {
      fontSize: '16px',
      fontWeight: FontWeights.semibold,
      color: theme.palette.neutralPrimary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px'
    },
    loadingContainer: {
      padding: '40px 24px',
      backgroundColor: theme.palette.themeLighterAlt,
      borderRadius: '16px',
      border: `1px solid ${theme.palette.themeLight}`,
      textAlign: 'center'
    },
    loadingText: {
      fontSize: '16px',
      fontWeight: FontWeights.semibold,
      color: theme.palette.themePrimary,
      marginTop: '12px'
    },
    description: {
      fontSize: '12px',
      color: theme.palette.neutralSecondary,
      fontStyle: 'italic',
      marginTop: '4px',
      marginBottom: '12px'
    }
  });

  const textFieldStyles = {
    fieldGroup: {
      borderRadius: '12px',
      border: `2px solid ${theme.palette.neutralLight}`,
      transition: 'all 0.2s ease-in-out',
      ':hover': {
        border: `2px solid ${theme.palette.themeLight}`
      },
      ':focus-within': {
        border: `2px solid ${theme.palette.themePrimary}`
      }
    }
  };

  const dropdownStyles = {
    dropdown: {
      borderRadius: '12px',
      border: `2px solid ${theme.palette.neutralLight}`,
      transition: 'all 0.2s ease-in-out'
    },
    title: {
      borderRadius: '12px',
      border: `2px solid ${theme.palette.neutralLight}`,
      ':hover': {
        border: `2px solid ${theme.palette.themeLight}`
      }
    }
  };

  const toggleStyles = {
    root: {
      marginBottom: '8px'
    },
    pill: {
      borderRadius: '12px'
    }
  };

  const buttonPrimaryStyles = {
    root: {
      borderRadius: '12px',
      height: '40px',
      fontSize: '14px',
      fontWeight: FontWeights.semibold,
      minWidth: '100px',
      transition: 'all 0.2s ease-in-out'
    }
  };

  const buttonSecondaryStyles = {
    root: {
      borderRadius: '12px',
      height: '40px',
      fontSize: '14px',
      fontWeight: FontWeights.regular,
      minWidth: '100px',
      border: `2px solid ${theme.palette.neutralLight}`,
      transition: 'all 0.2s ease-in-out'
    }
  };

  const messageBarStyles = {
    root: {
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: FontWeights.regular
    }
  };

  const separatorStyles = {
    root: {
      height: '2px',
      background: `linear-gradient(90deg, ${theme.palette.themePrimary}, ${theme.palette.themeSecondary})`,
      border: 'none',
      borderRadius: '1px'
    }
  };

  // Form state
  const [formPreferences, setFormPreferences] = useState<UpdateUserPreferencesRequest>({});
  const [formProfile, setFormProfile] = useState<UpdateUserProfileRequest>({});

  // Language options
  const languageOptions: IDropdownOption[] = [
    { key: 'en', text: 'English' },
    { key: 'fr', text: 'Français' },
    { key: 'es', text: 'Español' },
    { key: 'de', text: 'Deutsch' },
    { key: 'it', text: 'Italiano' }
  ];

  // Load user data on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Try to load profile first
      const profileResponse = await UserPreferencesService.getUserProfile();
      
      if (profileResponse.success && profileResponse.data) {
        // User exists, load their data
        setProfile(profileResponse.data);
        setFormProfile({
          name: profileResponse.data.name || '',
          phone: profileResponse.data.phone || ''
        });
        
        // Load preferences
        const preferencesResponse = await UserPreferencesService.getUserPreferences();
        if (preferencesResponse.success && preferencesResponse.data) {
          setPreferences(preferencesResponse.data);
          setFormPreferences({
            language: preferencesResponse.data.language,
            dark_mode: false,
            email_notifications: preferencesResponse.data.email_notifications,
            personnal_style_analysis: preferencesResponse.data.personnal_style_analysis,
            use_meeting_scripts: preferencesResponse.data.use_meeting_scripts,
            use_own_documents: preferencesResponse.data.use_own_documents
          });
        } else {
          // Use default preferences if none exist
          const defaultPrefs = UserPreferencesService.getDefaultPreferences();
          setFormPreferences(defaultPrefs);
          setMessage({ type: MessageBarType.info, text: 'Using default preferences. Save to create your preferences.' });
        }
      } else {
        // User doesn't exist in database - show message and use defaults
        const defaultPrefs = UserPreferencesService.getDefaultPreferences();
        setFormPreferences(defaultPrefs);
        setFormProfile({ name: '', phone: '' });
        setMessage({ 
          type: MessageBarType.warning, 
          text: 'User profile not found. Please complete registration by saving your preferences.' 
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Use default values and show error
      const defaultPrefs = UserPreferencesService.getDefaultPreferences();
      setFormPreferences(defaultPrefs);
      setFormProfile({ name: '', phone: '' });
      setMessage({ type: MessageBarType.error, text: 'Failed to load user data. Using default settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (field: keyof UpdateUserPreferencesRequest, value: any) => {
    setFormPreferences(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleProfileChange = (field: keyof UpdateUserProfileRequest, value: string) => {
    setFormProfile(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Validate preferences
      const validation = UserPreferencesService.validatePreferences(formPreferences);
      if (!validation.valid) {
        setMessage({ type: MessageBarType.error, text: validation.errors.join(', ') });
        setSaving(false);
        return;
      }

      // Handle user profile creation/update first
      let profileResult: { success: boolean; error?: string } = { success: true };
      
      if (!profile) {
        // User doesn't exist - create profile first
        if (user?.email && (formProfile.name || formProfile.phone)) {
          const createProfileData = {
            email: user.email,
            name: formProfile.name || undefined,
            phone: formProfile.phone || undefined
          };
          
          try {
            const response = await authFetch(API_ENDPOINTS.USER_PROFILE, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(createProfileData)
            });
            
            if (response.ok) {
              const profileData = await response.json();
              setProfile(profileData);
              profileResult = { success: true };
            } else {
              profileResult = { success: false, error: 'Failed to create user profile' };
            }
          } catch (error) {
            console.error('Error creating user profile:', error);
            profileResult = { success: false, error: 'Failed to create user profile' };
          }
        }
      } else if (formProfile.name !== profile.name || formProfile.phone !== profile.phone) {
        // Update existing profile if there are changes
        profileResult = await UserPreferencesService.updateUserProfile(formProfile);
      }
      
      // Save preferences
      let preferencesResult: { success: boolean; error?: string };
      if (preferences) {
        // Update existing preferences
        preferencesResult = await UserPreferencesService.updateUserPreferences(formPreferences);
      } else {
        // Create new preferences
        preferencesResult = await UserPreferencesService.createUserPreferences(formPreferences);
      }
      
      const allSuccessful = profileResult.success && preferencesResult.success;

      if (allSuccessful) {
        setMessage({ type: MessageBarType.success, text: 'Settings saved successfully!' });
        setHasChanges(false);
        // Reload data to get updated values
        await loadUserData();
      } else {
        const errors = [profileResult.error, preferencesResult.error].filter(Boolean).join(', ');
        setMessage({ type: MessageBarType.error, text: `Failed to save some settings: ${errors}` });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (preferences) {
      setFormPreferences({
        language: preferences.language,
        dark_mode: false,
        email_notifications: preferences.email_notifications,
        personnal_style_analysis: preferences.personnal_style_analysis,
        use_meeting_scripts: preferences.use_meeting_scripts,
        use_own_documents: preferences.use_own_documents
      });
    }
    if (profile) {
      setFormProfile({
        name: profile.name || '',
        phone: profile.phone || ''
      });
    }
    setHasChanges(false);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Stack 
          horizontalAlign="center" 
          verticalAlign="center" 
          className={styles.loadingContainer}
        >
          <Spinner 
            size={SpinnerSize.large} 
            styles={{ circle: { borderTopColor: theme.palette.themePrimary } }}
          />
          <Text className={styles.loadingText}>
            Chargement des préférences...
          </Text>
        </Stack>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Stack tokens={{ childrenGap: 24 }}>
        {/* Header */}
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text className={styles.header}>
            <Settings24Regular /> Préférences Utilisateur
          </Text>
          {onClose && (
            <IconButton
              iconProps={{ iconName: 'Cancel' }}
              ariaLabel="Fermer"
              onClick={onClose}
              styles={{
                root: {
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px'
                }
              }}
            />
          )}
        </Stack>

        {/* Message Bar */}
        {message && (
          <MessageBar
            messageBarType={message.type}
            onDismiss={() => setMessage(null)}
            dismissButtonAriaLabel="Fermer"
            styles={messageBarStyles}
          >
            {message.text}
          </MessageBar>
        )}

        {/* Profile Section */}
        <Stack tokens={{ childrenGap: 16 }}>
          <Text className={styles.sectionHeader}>
            <Person24Regular /> Profil
          </Text>
          
          <TextField
            label="Email"
            value={profile?.email || user?.email || ''}
            disabled
            description="L'email ne peut pas être modifié"
            styles={textFieldStyles}
            iconProps={{ iconName: 'Mail' }}
          />
          
          <TextField
            label="Nom complet"
            value={formProfile.name || ''}
            onChange={(_, value) => handleProfileChange('name', value || '')}
            placeholder="Votre nom complet"
            styles={textFieldStyles}
            iconProps={{ iconName: 'Contact' }}
          />
          
          <TextField
            label="Téléphone"
            value={formProfile.phone || ''}
            onChange={(_, value) => handleProfileChange('phone', value || '')}
            placeholder="Votre numéro de téléphone"
            styles={textFieldStyles}
            iconProps={{ iconName: 'Phone' }}
          />
        </Stack>

        <Separator styles={separatorStyles} />

        {/* Preferences Section */}
        <Stack tokens={{ childrenGap: 16 }}>
          <Text className={styles.sectionHeader}>
            <Settings24Regular /> Préférences
          </Text>

          <Stack tokens={{ childrenGap: 8 }}>
            <Dropdown
              label="Langue"
              selectedKey={formPreferences.language}
              options={languageOptions}
              onChange={(_, option) => handlePreferenceChange('language', option?.key)}
              styles={dropdownStyles}
            />
            <Text className={styles.description}>
              <Globe24Regular style={{ marginRight: '4px' }} />
              Choisissez votre langue préférée pour l'interface
            </Text>
          </Stack>

          <Stack tokens={{ childrenGap: 8 }}>
            <Toggle
              label="Notifications Email"
              checked={formPreferences.email_notifications || false}
              onChange={(_, checked) => handlePreferenceChange('email_notifications', checked)}
              onText="Activé"
              offText="Désactivé"
              styles={toggleStyles}
            />
            <Text className={styles.description}>
              <Mail24Regular style={{ marginRight: '4px' }} />
              Recevez des notifications par email pour les mises à jour importantes
            </Text>
          </Stack>

          <Stack tokens={{ childrenGap: 8 }}>
            <Toggle
              label="Analyse du Style Personnel"
              checked={formPreferences.personnal_style_analysis || false}
              onChange={(_, checked) => handlePreferenceChange('personnal_style_analysis', checked)}
              onText="Activé"
              offText="Désactivé"
              styles={toggleStyles}
            />
            <Text className={styles.description}>
              <BrainCircuit24Regular style={{ marginRight: '4px' }} />
              Permettre à l'IA d'analyser votre style d'écriture pour des suggestions personnalisées
            </Text>
          </Stack>

          <Stack tokens={{ childrenGap: 8 }}>
            <Toggle
              label="Scripts de Réunion"
              checked={formPreferences.use_meeting_scripts || false}
              onChange={(_, checked) => handlePreferenceChange('use_meeting_scripts', checked)}
              onText="Activé"
              offText="Désactivé"
              styles={toggleStyles}
            />
            <Text className={styles.description}>
              <VideoChat24Regular style={{ marginRight: '4px' }} />
              Utiliser des scripts générés par l'IA pour les réunions et appels
            </Text>
          </Stack>

          <Stack tokens={{ childrenGap: 8 }}>
            <Toggle
              label="Utiliser Mes Documents"
              checked={formPreferences.use_own_documents !== false}
              onChange={(_, checked) => handlePreferenceChange('use_own_documents', checked)}
              onText="Activé"
              offText="Désactivé"
              styles={toggleStyles}
            />
            <Text className={styles.description}>
              <DocumentText24Regular style={{ marginRight: '4px' }} />
              Permettre à l'IA de référencer vos documents personnels pour un meilleur contexte
            </Text>
          </Stack>
        </Stack>

        {/* Action Buttons */}
        <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign="end" style={{ marginTop: '20px' }}>
          <DefaultButton
            text="Réinitialiser"
            onClick={handleReset}
            disabled={!hasChanges || saving}
            styles={buttonSecondaryStyles}
            iconProps={{ iconName: 'Undo' }}
          />
          <PrimaryButton
            text="Enregistrer"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            styles={buttonPrimaryStyles}
            iconProps={{ iconName: 'Save' }}
          />
        </Stack>

        {saving && (
          <Stack 
            horizontal 
            horizontalAlign="center" 
            tokens={{ childrenGap: 12 }}
            styles={{
              root: {
                padding: '16px 24px',
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
                  fontSize: '14px',
                  fontWeight: FontWeights.semibold,
                  color: theme.palette.themePrimary
                }
              }}
            >
              Enregistrement en cours...
            </Text>
          </Stack>
        )}
      </Stack>
    </div>
  );
};

export default UserPreferencesComponent;
