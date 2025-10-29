/**
 * Login Form Component
 * Formulaire de connexion
 */

import { useState } from 'react';
import { Stack, TextField } from '@fluentui/react';
import { useAuthContext } from '@/contexts';
import { Button, ErrorMessage } from '@/components/Common';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack tokens={{ childrenGap: 20 }}>
        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Email Field */}
        <TextField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(_, value) => setEmail(value || '')}
          placeholder="votre@email.com"
        />

        {/* Password Field */}
        <TextField
          label="Mot de passe"
          type="password"
          required
          value={password}
          onChange={(_, value) => setPassword(value || '')}
          placeholder="********"
          canRevealPassword
        />

        {/* Submit Button */}
        <Button
          text="Se connecter"
          type="submit"
          loading={isLoading}
          variant="primary"
          styles={{
            root: {
              marginTop: '8px',
            },
          }}
        />
      </Stack>
    </form>
  );
}
