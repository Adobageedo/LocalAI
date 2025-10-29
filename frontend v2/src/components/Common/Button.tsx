/**
 * Button Component
 * Bouton personnalisé avec variantes et états
 */

import { PrimaryButton, DefaultButton, IButtonProps } from '@fluentui/react';

interface ButtonProps extends IButtonProps {
  variant?: 'primary' | 'default';
  loading?: boolean;
}

export default function Button({ variant = 'primary', loading = false, disabled, ...props }: ButtonProps) {
  const ButtonComponent = variant === 'primary' ? PrimaryButton : DefaultButton;

  return (
    <ButtonComponent
      {...props}
      disabled={disabled || loading}
      text={loading ? 'Chargement...' : props.text}
    />
  );
}
