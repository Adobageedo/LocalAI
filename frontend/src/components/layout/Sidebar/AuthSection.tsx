import React, { useState } from 'react';
import {
  Stack,
  TextField,
  PrimaryButton,
  DefaultButton,
  Text,
  MessageBar,
  MessageBarType,
  Dropdown,
  IDropdownOption,
  Spinner,
  SpinnerSize,
  getTheme,
  FontWeights,
  mergeStyles,
  IStackStyles
} from '@fluentui/react';
import { Person24Regular, PersonAccounts24Regular, SignOut24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import { useTranslations } from '../../../utils/i18n';
import { authFetch } from '../../../utils/helpers';
import { UserPreferencesService } from '../../../services/userPreferencesService';

// Country codes for phone numbers
const COUNTRY_CODES: IDropdownOption[] = [
  { key: '+1', text: '+1 (US/Canada)' },
  { key: '+33', text: '+33 (France)' },
  { key: '+34', text: '+34 (Spain)' },
  { key: '+39', text: '+39 (Italy)' },
  { key: '+44', text: '+44 (UK)' },
  { key: '+49', text: '+49 (Germany)' },
  { key: '+31', text: '+31 (Netherlands)' },
  { key: '+7', text: '+7 (Russia)' },
  { key: '+81', text: '+81 (Japan)' },
  { key: '+86', text: '+86 (China)' },
];

const AuthSection: React.FC = () => {
  const { user, login, register, logout, loading } = useAuth();
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [streetAddress, setStreetAddress] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const theme = getTheme();
  
  const cardStyles: IStackStyles = {
    root: {
      backgroundColor: theme.palette.white,
      border: `1px solid ${theme.palette.neutralLight}`,
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      marginBottom: '20px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
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
    fontSize: '18px',
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
    marginBottom: '20px',
    lineHeight: '1.4'
  });
  
  const modernButtonStyles = {
    root: {
      borderRadius: '12px',
      height: '44px',
      fontSize: '14px',
      fontWeight: FontWeights.semibold,
      minWidth: '120px',
      transition: 'all 0.2s ease-in-out'
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

  const handleSubmit = async () => {
    // Validation for login
    if (!email || !password) {
      setError('Please fill in email and password');
      return;
    }

    // Additional validation for registration
    if (isRegistering && (!fullName || !phone || !streetAddress || !city || !postalCode || !country)) {
      setError('Please fill in all required fields for registration');
      return;
    }

    setAuthLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegistering) {
        // Register with Firebase
        const userCredential = await register(email, password);
        const uid = userCredential.user?.uid;
        
        if (uid) {
          // Wait for Firebase auth to be fully processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Create user profile using the user creation API
            const profileData = {
              email: email,
              name: fullName,
              phone: countryCode + phone
            };
            
            console.log('Creating user profile in database:', profileData);
            const profileResponse = await authFetch(API_ENDPOINTS.USER_PROFILE, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(profileData),
            });
            
            if (!profileResponse.ok) {
              const errorData = await profileResponse.json().catch(() => ({}));
              throw new Error(errorData.detail || `HTTP ${profileResponse.status}: ${profileResponse.statusText}`);
            }
            
            const profileResult = await profileResponse.json();
            console.log('User profile created successfully:', profileResult);
            
            // Create default user preferences
            const defaultPreferences = UserPreferencesService.getDefaultPreferences();
            console.log('Creating default user preferences:', defaultPreferences);
            
            const preferencesResponse = await UserPreferencesService.createUserPreferences(defaultPreferences);
            
            if (!preferencesResponse.success) {
              console.warn('Failed to create default preferences:', preferencesResponse.error);
              // Don't fail registration if preferences creation fails
            } else {
              console.log('Default preferences created successfully:', preferencesResponse.data);
            }
            
          } catch (backendError: any) {
            console.error('Backend user creation error:', backendError);
            setError(`Account created but profile setup failed: ${backendError.message}`);
            return;
          }
        }
        
        setSuccess('Account created successfully!');
        // Clear form fields after successful registration
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        setStreetAddress('');
        setAddressLine2('');
        setCity('');
        setState('');
        setPostalCode('');
        setCountry('');
        setIsRegistering(false);
      } else {
        await login(email, password);
        setSuccess('Logged in successfully!');
        setEmail('');
        setPassword('');
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSuccess('Logged out successfully');
    } catch (error: any) {
      setError(error.message || 'Logout failed');
    }
  };

  if (loading) {
    return (
      <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }} styles={cardStyles}>
        <Spinner 
          size={SpinnerSize.large} 
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
          Chargement de l'authentification...
        </Text>
      </Stack>
    );
  }

  if (user) {
    return (
      <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
        <Text className={headerStyles}>
          <Person24Regular /> Compte Utilisateur
        </Text>
        <Text className={subHeaderStyles}>
          Vous êtes connecté et prêt à utiliser l'assistant IA.
        </Text>
        
        <Stack tokens={{ childrenGap: 12 }}>
          <Text 
            styles={{ 
              root: { 
                fontSize: '14px',
                fontWeight: FontWeights.semibold,
                color: theme.palette.neutralPrimary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              } 
            }}
          >
            Email Connecté
          </Text>
          <Stack 
            horizontal 
            verticalAlign="center" 
            tokens={{ childrenGap: 12 }}
            styles={{
              root: {
                padding: '12px 16px',
                backgroundColor: theme.palette.themeLighterAlt,
                borderRadius: '8px',
                border: `1px solid ${theme.palette.themeLight}`
              }
            }}
          >
            <Person24Regular style={{ fontSize: '18px', color: theme.palette.themePrimary }} />
            <Text 
              styles={{ 
                root: { 
                  fontSize: '14px',
                  fontWeight: FontWeights.regular,
                  color: theme.palette.neutralPrimary
                } 
              }}
            >
              {user.email}
            </Text>
          </Stack>
        </Stack>
        
        <DefaultButton 
          text="Se Déconnecter" 
          onClick={handleLogout} 
          styles={modernButtonStyles}
          iconProps={{ iconName: 'SignOut' }}
        />
        
        {success && (
          <MessageBar 
            messageBarType={MessageBarType.success} 
            onDismiss={() => setSuccess('')}
            styles={{
              root: {
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: FontWeights.regular
              }
            }}
          >
            {success}
          </MessageBar>
        )}
        {error && (
          <MessageBar 
            messageBarType={MessageBarType.error} 
            onDismiss={() => setError('')}
            styles={{
              root: {
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: FontWeights.regular
              }
            }}
          >
            {error}
          </MessageBar>
        )}
      </Stack>
    );
  }

  return (
    <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
      <Text className={headerStyles}>
        <PersonAccounts24Regular /> {isRegistering ? 'Créer un Compte' : 'Se Connecter'}
      </Text>
      <Text className={subHeaderStyles}>
        {isRegistering ? 'Créez votre compte pour accéder à l\'assistant IA.' : 'Connectez-vous pour utiliser l\'assistant IA.'}
      </Text>

      {error && (
        <MessageBar 
          messageBarType={MessageBarType.error} 
          onDismiss={() => setError('')}
          styles={{
            root: {
              borderRadius: '12px',
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
              fontSize: '14px',
              fontWeight: FontWeights.regular
            }
          }}
        >
          {success}
        </MessageBar>
      )}

      <TextField
        label={`Email (requis)`}
        type="email"
        value={email}
        onChange={(_, newValue) => setEmail(newValue || '')}
        placeholder="votre.email@exemple.com"
        iconProps={{ iconName: 'Contact' }}
        disabled={authLoading}
        required
        styles={textFieldStyles}
      />

      <TextField
        label={`Mot de passe (requis)`}
        type="password"
        value={password}
        onChange={(_, newValue) => setPassword(newValue || '')}
        placeholder="Entrez votre mot de passe"
        iconProps={{ iconName: 'Lock' }}
        disabled={authLoading}
        canRevealPassword
        required
        styles={textFieldStyles}
      />

      {/* Additional fields for registration */}
      {isRegistering && (
        <>
          <TextField
            label="Nom complet (requis)"
            value={fullName}
            onChange={(_, newValue) => setFullName(newValue || '')}
            placeholder="Votre nom complet"
            iconProps={{ iconName: 'Contact' }}
            disabled={authLoading}
            required
            styles={textFieldStyles}
          />

          <Stack horizontal tokens={{ childrenGap: 12 }}>
            <Dropdown
              label="Indicatif (requis)"
              selectedKey={countryCode}
              onChange={(_, option) => setCountryCode(option?.key as string || '+1')}
              options={COUNTRY_CODES}
              disabled={authLoading}
              styles={{ 
                root: { width: '140px' },
                dropdown: { borderRadius: '12px' },
                title: { borderRadius: '12px', border: `2px solid ${theme.palette.neutralLight}` }
              }}
            />
            <TextField
              label="Téléphone (requis)"
              value={phone}
              onChange={(_, newValue) => setPhone(newValue || '')}
              placeholder="123456789"
              iconProps={{ iconName: 'Phone' }}
              disabled={authLoading}
              required
              styles={{ ...textFieldStyles, root: { flexGrow: 1 } }}
            />
          </Stack>

          <TextField
            label="Adresse (requis)"
            value={streetAddress}
            onChange={(_, newValue) => setStreetAddress(newValue || '')}
            placeholder="Votre adresse"
            iconProps={{ iconName: 'MapPin' }}
            disabled={authLoading}
            required
            styles={textFieldStyles}
          />
          
          <TextField
            label="Complément d'adresse (optionnel)"
            value={addressLine2}
            onChange={(_, newValue) => setAddressLine2(newValue || '')}
            placeholder="Appartement, étage, etc."
            iconProps={{ iconName: 'MapPin' }}
            disabled={authLoading}
            styles={textFieldStyles}
          />
          
          <Stack horizontal tokens={{ childrenGap: 12 }}>
            <TextField
              label="Ville (requis)"
              value={city}
              onChange={(_, newValue) => setCity(newValue || '')}
              placeholder="Votre ville"
              iconProps={{ iconName: 'CityNext' }}
              disabled={authLoading}
              required
              styles={{ ...textFieldStyles, root: { flexGrow: 1 } }}
            />
            <TextField
              label="Région (requis)"
              value={state}
              onChange={(_, newValue) => setState(newValue || '')}
              placeholder="Votre région"
              iconProps={{ iconName: 'MapPin' }}
              disabled={authLoading}
              required
              styles={{ ...textFieldStyles, root: { flexGrow: 1 } }}
            />
          </Stack>
          
          <Stack horizontal tokens={{ childrenGap: 12 }}>
            <TextField
              label="Code postal (requis)"
              value={postalCode}
              onChange={(_, newValue) => setPostalCode(newValue || '')}
              placeholder="12345"
              iconProps={{ iconName: 'NumberField' }}
              disabled={authLoading}
              required
              styles={{ ...textFieldStyles, root: { flexGrow: 1 } }}
            />
            <TextField
              label="Pays (requis)"
              value={country}
              onChange={(_, newValue) => setCountry(newValue || '')}
              placeholder="France"
              iconProps={{ iconName: 'Globe' }}
              disabled={authLoading}
              required
              styles={{ ...textFieldStyles, root: { flexGrow: 1 } }}
            />
          </Stack>
        </>
      )}

      <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
        <PrimaryButton
          text={isRegistering ? 'Créer le Compte' : 'Se Connecter'}
          onClick={handleSubmit}
          disabled={
            authLoading || 
            !email || 
            !password || 
            (isRegistering && (!fullName || !phone || !streetAddress || !city || !postalCode || !country))
          }
          styles={modernButtonStyles}
          iconProps={{ iconName: isRegistering ? 'AddFriend' : 'Signin' }}
        />
        <DefaultButton
          text={isRegistering ? 'Retour à la Connexion' : 'Créer un Compte'}
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
            setSuccess('');
            // Clear additional fields when switching modes
            setFullName('');
            setPhone('');
            setStreetAddress('');
            setAddressLine2('');
            setCity('');
            setState('');
            setPostalCode('');
            setCountry('');
          }}
          disabled={authLoading}
          styles={{
            root: {
              borderRadius: '12px',
              height: '44px',
              fontSize: '14px',
              fontWeight: FontWeights.regular,
              minWidth: '100px',
              border: `2px solid ${theme.palette.neutralLight}`,
              transition: 'all 0.2s ease-in-out'
            }
          }}
          iconProps={{ iconName: isRegistering ? 'Back' : 'AddFriend' }}
        />
      </Stack>

      {authLoading && (
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
            {isRegistering ? 'Création du compte...' : 'Connexion en cours...'}
          </Text>
        </Stack>
      )}
    </Stack>
  );
};

export default AuthSection;
