import React, { useState } from 'react';
import { 
  Stack, 
  Text, 
  TextField, 
  PrimaryButton, 
  DefaultButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import { Person20Regular } from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from '../utils/i18n';

const AuthSection: React.FC = () => {
  const { user, login, register, logout, loading } = useAuth();
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setAuthLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegistering) {
        await register(email, password);
        setSuccess('Account created successfully!');
      } else {
        await login(email, password);
        setSuccess('Logged in successfully!');
      }
      setEmail('');
      setPassword('');
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
        {isRegistering ? 'Create Account' : 'Sign in to your account'}
      </Text>
      <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
        Use your credentials to access email templates
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
        label="Email"
        type="email"
        value={email}
        onChange={(_, newValue) => setEmail(newValue || '')}
        placeholder="yourname@example.com"
        iconProps={{ iconName: 'Contact' }}
        disabled={authLoading}
      />

      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(_, newValue) => setPassword(newValue || '')}
        placeholder="Enter your password"
        iconProps={{ iconName: 'Lock' }}
        disabled={authLoading}
        canRevealPassword
      />

      <Stack horizontal tokens={{ childrenGap: 8 }}>
        <PrimaryButton
          text={isRegistering ? 'Create Account' : 'Sign In'}
          onClick={handleSubmit}
          disabled={authLoading || !email || !password}
        />
        <DefaultButton
          text={isRegistering ? 'Back to Sign In' : 'Create Account'}
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
            setSuccess('');
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
