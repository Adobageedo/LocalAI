/**
 * Empty State Component
 * Affichage pour les états vides (pas de données)
 */

import { Stack, Text, Icon } from '@fluentui/react';
import { useTheme } from '@/contexts';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = 'InboxCheck', title, description, action }: EmptyStateProps) {
  const { mode } = useTheme();

  return (
    <Stack
      verticalAlign="center"
      horizontalAlign="center"
      tokens={{ childrenGap: 20 }}
      styles={{
        root: {
          padding: '60px 20px',
          textAlign: 'center',
        },
      }}
    >
      {/* Icon */}
      <Icon
        iconName={icon}
        styles={{
          root: {
            fontSize: '64px',
            color: mode === 'dark' ? '#666666' : '#a19f9d',
          },
        }}
      />

      {/* Title */}
      <Text
        variant="xLarge"
        styles={{
          root: {
            fontWeight: 600,
            color: mode === 'dark' ? '#ffffff' : '#323130',
          },
        }}
      >
        {title}
      </Text>

      {/* Description */}
      {description && (
        <Text
          variant="medium"
          styles={{
            root: {
              maxWidth: '400px',
              color: mode === 'dark' ? '#a19f9d' : '#605e5c',
            },
          }}
        >
          {description}
        </Text>
      )}

      {/* Action */}
      {action && <Stack>{action}</Stack>}
    </Stack>
  );
}
