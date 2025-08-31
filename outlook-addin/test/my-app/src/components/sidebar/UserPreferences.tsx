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
  SpinnerSize
} from '@fluentui/react';
import { UserPreferencesService, UserPreferences, UserProfile, UpdateUserPreferencesRequest, UpdateUserProfileRequest } from '../../services/userPreferencesService';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/authFetch';
import { API_ENDPOINTS } from '../../config/api';

interface UserPreferencesProps {
  onClose?: () => void;
}

const UserPreferencesComponent: React.FC<UserPreferencesProps> = ({ onClose }) => {
  const { user } = useAuth();

  // State management
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: MessageBarType; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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
      <Stack horizontalAlign="center" verticalAlign="center" style={{ minHeight: '200px' }}>
        <Spinner size={SpinnerSize.large} label="Loading preferences..." />
      </Stack>
    );
  }

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      {/* Header */}
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
          {'User Preferences'}
        </Text>
        {onClose && (
          <IconButton
            iconProps={{ iconName: 'Cancel' }}
            ariaLabel="Close"
            onClick={onClose}
          />
        )}
      </Stack>

      {/* Message Bar */}
      {message && (
        <MessageBar
          messageBarType={message.type}
          onDismiss={() => setMessage(null)}
          dismissButtonAriaLabel="Close"
        >
          {message.text}
        </MessageBar>
      )}

      {/* Profile Section */}
      <Stack tokens={{ childrenGap: 12 }}>
        <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
          {'Profile'}
        </Text>
        
        <TextField
          label={'Email'}
          value={profile?.email || user?.email || ''}
          disabled
          description="Email cannot be changed"
        />
        
        <TextField
          label={'Name'}
          value={formProfile.name || ''}
          onChange={(_, value) => handleProfileChange('name', value || '')}
          placeholder="Enter your full name"
        />
        
        <TextField
          label={'Phone'}
          value={formProfile.phone || ''}
          onChange={(_, value) => handleProfileChange('phone', value || '')}
          placeholder="Enter your phone number"
        />
      </Stack>

      <Separator />

      {/* Preferences Section */}
      <Stack tokens={{ childrenGap: 12 }}>
        <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
          {'Preferences'}
        </Text>

        <Dropdown
          label={'Language'}
          selectedKey={formPreferences.language}
          options={languageOptions}
          onChange={(_, option) => handlePreferenceChange('language', option?.key)}
        />

        {/* <Toggle
          label={'Dark Mode'}
          checked={formPreferences.dark_mode || false}
          onChange={(_, checked) => handlePreferenceChange('dark_mode', checked)}
          onText="Enabled"
          offText="Disabled"
        /> */}

        <Toggle
          label={'Email Notifications'}
          checked={formPreferences.email_notifications || false}
          onChange={(_, checked) => handlePreferenceChange('email_notifications', checked)}
          onText="Enabled"
          offText="Disabled"
        />

        <Toggle
          label={'Personal Style Analysis'}
          checked={formPreferences.personnal_style_analysis || false}
          onChange={(_, checked) => handlePreferenceChange('personnal_style_analysis', checked)}
          onText="Enabled"
          offText="Disabled"
        />
        <Text variant="small" styles={{ root: { color: '#666', marginTop: '-8px', marginBottom: '8px' } }}>
          Enable AI analysis of your writing style for personalized suggestions
        </Text>

        <Toggle
          label={'Use Meeting Scripts'}
          checked={formPreferences.use_meeting_scripts || false}
          onChange={(_, checked) => handlePreferenceChange('use_meeting_scripts', checked)}
          onText="Enabled"
          offText="Disabled"
        />
        <Text variant="small" styles={{ root: { color: '#666', marginTop: '-8px', marginBottom: '8px' } }}>
          Use AI-generated scripts for meetings and calls
        </Text>

        <Toggle
          label={'Use Own Documents'}
          checked={formPreferences.use_own_documents !== false}
          onChange={(_, checked) => handlePreferenceChange('use_own_documents', checked)}
          onText="Enabled"
          offText="Disabled"
        />
        <Text variant="small" styles={{ root: { color: '#666', marginTop: '-8px', marginBottom: '8px' } }}>
          Allow AI to reference your personal documents for better context
        </Text>
      </Stack>

      {/* Action Buttons */}
      <Stack horizontal tokens={{ childrenGap: 8 }} horizontalAlign="end" style={{ marginTop: '20px' }}>
        <DefaultButton
          text={'Reset'}
          onClick={handleReset}
          disabled={!hasChanges || saving}
        />
        <PrimaryButton
          text={'Save'}
          onClick={handleSave}
          disabled={!hasChanges || saving}
        />
      </Stack>

      {saving && (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }}>
          <Spinner size={SpinnerSize.small} />
          <Text>{'Saving...'}</Text>
        </Stack>
      )}
    </Stack>
  );
};

export default UserPreferencesComponent;
