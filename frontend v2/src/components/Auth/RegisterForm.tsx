/**
 * Register Form Component
 * Formulaire d'inscription
 */

import { useState } from 'react';
import { Stack, TextField } from '@fluentui/react';
import { useAuthContext } from '@/contexts';
import { Button, ErrorMessage } from '@/components/Common';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const { register, isLoading, error } = useAuthContext();

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (password !== confirmPassword) {
      setValidationError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setValidationError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setValidationError('');
    await register({
      email,
      password,
      displayName: name,
      acceptTerms: true, // TODO: Add checkbox for terms acceptance
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack tokens={{ childrenGap: 20 }}>
        {/* Error Messages */}
        {(error || validationError) && (
          <ErrorMessage message={validationError || error || ''} />
        )}

        {/* Name Field */}
        <TextField
          label="Nom complet"
          required
          value={name}
          onChange={(_, value) => setName(value || '')}
          placeholder="Jean Dupont"
        />

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
          description="Minimum 6 caractères"
        />

        {/* Confirm Password Field */}
        <TextField
          label="Confirmer le mot de passe"
          type="password"
          required
          value={confirmPassword}
          onChange={(_, value) => setConfirmPassword(value || '')}
          placeholder="********"
          canRevealPassword
        />

        {/* Submit Button */}
        <Button
          text="S'inscrire"
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
