/**
 * Error Message Component
 * Affichage des messages d'erreur
 */

import { MessageBar, MessageBarType, Stack } from '@fluentui/react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ title, message, onDismiss }: ErrorMessageProps) {
  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <MessageBar
        messageBarType={MessageBarType.error}
        onDismiss={onDismiss}
        isMultiline={message.length > 100}
        dismissButtonAriaLabel="Fermer"
      >
        {title && <strong>{title}</strong>}
        {title && ' '}
        {message}
      </MessageBar>
    </Stack>
  );
}
