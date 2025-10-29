import React from 'react';
import { Stack, Spinner, SpinnerSize, Text } from '@fluentui/react';
import { theme } from '../../../../styles';

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
}

/**
 * Compact loading indicator
 */
export function LoadingIndicator({ isLoading, message = 'Génération en cours...' }: LoadingIndicatorProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <Stack 
      horizontal 
      tokens={{ childrenGap: 8 }} 
      verticalAlign="center" 
      styles={{
        root: {
          backgroundColor: theme.colors.infoLight,
          borderRadius: theme.borderRadius.medium,
          padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
          border: `1px solid ${theme.colors.primary}20`,
        }
      }}
    >
      <Spinner size={SpinnerSize.xSmall} />
      <Text styles={{ 
        root: { 
          color: theme.colors.primary, 
          fontWeight: theme.typography.fontWeight.medium,
          fontSize: theme.typography.fontSize.sm,
        } 
      }}>
        {message}
      </Text>
    </Stack>
  );
}
