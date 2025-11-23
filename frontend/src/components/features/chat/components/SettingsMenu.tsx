/**
 * Settings menu component with RAG, Fine-tune, and Attachments toggles
 */

import React from 'react';
import { Stack, Text, Toggle, Callout, DirectionalHint, getTheme } from '@fluentui/react';
import { ChatSettings } from '../types';

interface SettingsMenuProps {
  targetRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  settings: ChatSettings;
  hasAttachments: boolean;
  attachmentCount: number;
  onDismiss: () => void;
  onSettingsChange: (settings: Partial<ChatSettings>) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  targetRef,
  isOpen,
  settings,
  hasAttachments,
  attachmentCount,
  onDismiss,
  onSettingsChange
}) => {
  const theme = getTheme();

  if (!isOpen || !targetRef.current) return null;

  return (
    <Callout
      target={targetRef.current}
      onDismiss={onDismiss}
      directionalHint={DirectionalHint.topRightEdge}
      styles={{ root: { padding: 16, minWidth: 280 } }}
    >
      <Text
        variant="mediumPlus"
        styles={{ root: { fontWeight: 600, marginBottom: 12, display: 'block' } }}
      >
        ⚙️ Paramètres
      </Text>
      
      <Stack tokens={{ childrenGap: 12 }}>
        <Toggle
          label="📧 Utiliser emails (RAG)"
          checked={settings.useRag}
          onChange={(_, checked) => onSettingsChange({ useRag: !!checked })}
          styles={{
            root: { marginBottom: 0 },
            label: { fontWeight: 500 },
          }}
        />
        
        <Toggle
          label="✍️ Utiliser mon style"
          checked={settings.useFineTune}
          onChange={(_, checked) => onSettingsChange({ useFineTune: !!checked })}
          styles={{
            root: { marginBottom: 0 },
            label: { fontWeight: 500 },
          }}
        />
        
        {hasAttachments && (
          <Toggle
            label={`📎 Envoyer pièces jointes (${attachmentCount})`}
            checked={settings.includeAttachments}
            onChange={(_, checked) => onSettingsChange({ includeAttachments: !!checked })}
            styles={{
              root: { marginBottom: 0 },
              label: {
                fontWeight: 500,
                color: settings.includeAttachments
                  ? theme.palette.themePrimary
                  : theme.palette.neutralSecondary,
              },
            }}
          />
        )}
        
        <Text
          variant="small"
          styles={{
            root: {
              color: theme.palette.neutralSecondary,
              fontStyle: 'italic'
            }
          }}
        >
          Les pièces jointes sont traitées par le backend
        </Text>
      </Stack>
    </Callout>
  );
};
