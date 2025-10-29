/**
 * Card Component
 * Carte pour afficher du contenu avec style cohérent
 */

import { ReactNode } from 'react';
import { Stack, Text } from '@fluentui/react';
import { useTheme } from '@/contexts';

interface CardProps {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  padding?: number;
  onClick?: () => void;
}

export default function Card({ title, children, actions, padding = 20, onClick }: CardProps) {
  const { mode } = useTheme();

  return (
    <Stack
      styles={{
        root: {
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          border: `1px solid ${mode === 'dark' ? '#3e3e3e' : '#edebe9'}`,
          borderRadius: '4px',
          padding: `${padding}px`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'box-shadow 0.2s',
          ':hover': onClick ? {
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          } : undefined,
        },
      }}
      onClick={onClick}
      tokens={{ childrenGap: 16 }}
    >
      {/* Header */}
      {(title || actions) && (
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          {title && (
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
          )}
          {actions && <Stack horizontal tokens={{ childrenGap: 8 }}>{actions}</Stack>}
        </Stack>
      )}

      {/* Content */}
      <Stack>{children}</Stack>
    </Stack>
  );
}
