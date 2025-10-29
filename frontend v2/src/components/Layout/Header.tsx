/**
 * Header Component
 * En-tête de l'application avec logo, navigation et actions utilisateur
 */

import { Stack, Text, IconButton, Persona, PersonaSize } from '@fluentui/react';
import { useTheme, useAuthContext } from '@/contexts';

export default function Header() {
  const { mode, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuthContext();

  return (
    <Stack
      horizontal
      verticalAlign="center"
      styles={{
        root: {
          height: '60px',
          padding: '0 24px',
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#0078d4',
          borderBottom: `1px solid ${mode === 'dark' ? '#3e3e3e' : '#106ebe'}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* Logo et Titre */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
        <Text
          variant="xLarge"
          styles={{
            root: {
              fontWeight: 600,
              color: '#ffffff',
            },
          }}
        >
          ✉️ Outlook AI Assistant
        </Text>
      </Stack>

      {/* Spacer */}
      <Stack.Item grow={1} />

      {/* Actions */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 16 }}>
        {/* Theme Toggle */}
        <IconButton
          iconProps={{ iconName: mode === 'dark' ? 'Sunny' : 'ClearNight' }}
          title="Changer le thème"
          onClick={toggleTheme}
          styles={{
            root: {
              color: '#ffffff',
            },
            rootHovered: {
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
          }}
        />

        {/* User Info */}
        {isAuthenticated && user && (
          <Persona
            text={user.email}
            size={PersonaSize.size32}
            hidePersonaDetails={false}
            styles={{
              root: {
                color: '#ffffff',
              },
            }}
          />
        )}
      </Stack>
    </Stack>
  );
}
