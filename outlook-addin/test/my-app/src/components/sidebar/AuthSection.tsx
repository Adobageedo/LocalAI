import React, { useState, useContext } from 'react';
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
  SpinnerSize
} from '@fluentui/react';
import { Person20Regular } from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import { useTranslations } from '../../utils/i18n';

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
          // Create a user object matching your database schema
          const userData = {
            id: uid,
            email: email,
            name: fullName,
            phone: countryCode + phone,
            address: {
              street: streetAddress,
              addressLine2: addressLine2,
              city: city,
              state: state,
              postalCode: postalCode,
              country: country
            }
          };
          console.log('Creating user in database:', userData);

          // Send the user data to your backend
          try {
            const response = await fetch(API_ENDPOINTS.USERS, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userData)
            });

            if (!response.ok) {
              throw new Error(`Backend registration failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('User created in backend:', result);
          } catch (backendError: any) {
            console.error('Backend registration error:', backendError);
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
      <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
        <Spinner size={SpinnerSize.medium} label="Loading authentication..." />
      </Stack>
    );
  }

  if (user) {
    return (
      <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
        <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
          {t.welcomeBack}
        </Text>
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
          <Person20Regular style={{ fontSize: '16px', color: '#0078d4' }} />
          <Text variant="medium">{t.signedInAs}: {user.email}</Text>
        </Stack>
        <DefaultButton text={t.signOut} onClick={handleLogout} />
        {success && (
          <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setSuccess('')}>
            {success}
          </MessageBar>
        )}
        {error && (
          <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
            {error}
          </MessageBar>
        )}
      </Stack>
    );
  }

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
      <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
        {isRegistering ? t.createAccount : t.signInToAccount}
      </Text>
      <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
        {t.useCredentials}
      </Text>

      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
          {error}
        </MessageBar>
      )}

      {success && (
        <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setSuccess('')}>
          {success}
        </MessageBar>
      )}

      <TextField
        label={`${t.email} (${t.required})`}
        type="email"
        value={email}
        onChange={(_, newValue) => setEmail(newValue || '')}
        placeholder="yourname@example.com"
        iconProps={{ iconName: 'Contact' }}
        disabled={authLoading}
        required
      />

      <TextField
        label={`${t.password} (${t.required})`}
        type="password"
        value={password}
        onChange={(_, newValue) => setPassword(newValue || '')}
        placeholder={`${t.enterYour} ${t.password.toLowerCase()}`}
        iconProps={{ iconName: 'Lock' }}
        disabled={authLoading}
        canRevealPassword
        required
      />

      {/* Additional fields for registration */}
      {isRegistering && (
        <>
          <TextField
            label={`${t.fullName} (${t.required})`}
            value={fullName}
            onChange={(_, newValue) => setFullName(newValue || '')}
            placeholder={`${t.enterYour} ${t.fullName.toLowerCase()}`}
            iconProps={{ iconName: 'Contact' }}
            disabled={authLoading}
            required
          />

          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <Dropdown
              label={`${t.countryCode} (${t.required})`}
              selectedKey={countryCode}
              onChange={(_, option) => setCountryCode(option?.key as string || '+1')}
              options={COUNTRY_CODES}
              disabled={authLoading}
              styles={{ root: { width: '140px' } }}
            />
            <TextField
              label={`${t.phoneNumber} (${t.required})`}
              value={phone}
              onChange={(_, newValue) => setPhone(newValue || '')}
              placeholder="123456789"
              iconProps={{ iconName: 'Phone' }}
              disabled={authLoading}
              required
              styles={{ root: { flexGrow: 1 } }}
            />
          </Stack>

          <TextField
            label={`${t.streetAddress} (${t.required})`}
            value={streetAddress}
            onChange={(_, newValue) => setStreetAddress(newValue || '')}
            placeholder={`${t.enterYour} ${t.streetAddress.toLowerCase()}`}
            iconProps={{ iconName: 'MapPin' }}
            disabled={authLoading}
            required
          />
          
          <TextField
            label={`${t.addressLine2} (${t.optional})`}
            value={addressLine2}
            onChange={(_, newValue) => setAddressLine2(newValue || '')}
            placeholder={`${t.enterYour} ${t.addressLine2.toLowerCase()}`}
            iconProps={{ iconName: 'MapPin' }}
            disabled={authLoading}
          />
          
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <TextField
              label={`${t.city} (${t.required})`}
              value={city}
              onChange={(_, newValue) => setCity(newValue || '')}
              placeholder={`${t.enterYour} ${t.city.toLowerCase()}`}
              iconProps={{ iconName: 'CityNext' }}
              disabled={authLoading}
              required
              styles={{ root: { flexGrow: 1 } }}
            />
            <TextField
              label={`${t.state} (${t.required})`}
              value={state}
              onChange={(_, newValue) => setState(newValue || '')}
              placeholder={`${t.enterYour} ${t.state.toLowerCase()}`}
              iconProps={{ iconName: 'MapPin' }}
              disabled={authLoading}
              required
              styles={{ root: { flexGrow: 1 } }}
            />
          </Stack>
          
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <TextField
              label={`${t.postalCode} (${t.required})`}
              value={postalCode}
              onChange={(_, newValue) => setPostalCode(newValue || '')}
              placeholder={`${t.enterYour} ${t.postalCode.toLowerCase()}`}
              iconProps={{ iconName: 'NumberField' }}
              disabled={authLoading}
              required
              styles={{ root: { flexGrow: 1 } }}
            />
            <TextField
              label={`${t.country} (${t.required})`}
              value={country}
              onChange={(_, newValue) => setCountry(newValue || '')}
              placeholder={`${t.enterYour} ${t.country.toLowerCase()}`}
              iconProps={{ iconName: 'Globe' }}
              disabled={authLoading}
              required
              styles={{ root: { flexGrow: 1 } }}
            />
          </Stack>
        </>
      )}

      <Stack horizontal tokens={{ childrenGap: 8 }}>
        <PrimaryButton
          text={isRegistering ? t.createAccount : t.signIn}
          onClick={handleSubmit}
          disabled={
            authLoading || 
            !email || 
            !password || 
            (isRegistering && (!fullName || !phone || !streetAddress || !city || !postalCode || !country))
          }
        />
        <DefaultButton
          text={isRegistering ? t.backToSignIn : t.createAccount}
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
        />
      </Stack>

      {authLoading && (
        <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 8 }}>
          <Spinner size={SpinnerSize.small} />
          <Text variant="medium">
            {isRegistering ? 'Creating account...' : 'Signing in...'}
          </Text>
        </Stack>
      )}
    </Stack>
  );
};

export default AuthSection;
