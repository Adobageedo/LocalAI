import React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { theme } from '../../styles';

interface StatusMessagesProps {
  error?: string;
  success?: string;
  onDismissError?: () => void;
  onDismissSuccess?: () => void;
}

/**
 * Compact status messages for errors and success
 */
export function StatusMessages({
  error,
  success,
  onDismissError,
  onDismissSuccess
}: StatusMessagesProps) {
  const compactStyles = {
    root: {
      borderRadius: theme.borderRadius.medium,
      fontSize: theme.typography.fontSize.sm,
      padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
      minHeight: 32,
    }
  };

  return (
    <>
      {error && (
        <MessageBar 
          messageBarType={MessageBarType.error} 
          onDismiss={onDismissError}
          styles={compactStyles}
        >
          {error}
        </MessageBar>
      )}

      {success && (
        <MessageBar 
          messageBarType={MessageBarType.success} 
          onDismiss={onDismissSuccess}
          styles={compactStyles}
        >
          {success}
        </MessageBar>
      )}
    </>
  );
}
