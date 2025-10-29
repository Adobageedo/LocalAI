/**
 * Loading Spinner Component
 * Indicateur de chargement centralisé
 */

import { Stack, Spinner, SpinnerSize, Text } from '@fluentui/react';

interface LoadingSpinnerProps {
  message?: string;
  size?: SpinnerSize;
  centered?: boolean;
}

export default function LoadingSpinner({ 
  message = 'Chargement...', 
  size = SpinnerSize.large,
  centered = true 
}: LoadingSpinnerProps) {
  const content = (
    <Stack tokens={{ childrenGap: 16 }} horizontalAlign="center">
      <Spinner size={size} />
      {message && <Text variant="medium">{message}</Text>}
    </Stack>
  );

  if (centered) {
    return (
      <Stack
        verticalAlign="center"
        horizontalAlign="center"
        styles={{
          root: {
            height: '100%',
            minHeight: '200px',
          },
        }}
      >
        {content}
      </Stack>
    );
  }

  return content;
}
