import React from 'react';
import { Stack, PrimaryButton, DefaultButton } from '@fluentui/react';
import { useTranslations } from '../../utils/i18n';
import { theme, compactButtonStyles } from '../../styles';

interface ActionButtonsProps {
  onNewTemplate: () => void;
  onInsertTemplate: () => void;
  onCopyTemplate: () => void;
  hasTemplate: boolean;
}

/**
 * Action buttons for template operations
 * Uses universal theme styles for consistency
 */
export function ActionButtons({
  onNewTemplate,
  onInsertTemplate,
  onCopyTemplate,
  hasTemplate
}: ActionButtonsProps) {
  const t = useTranslations();

  return (
    <Stack 
      horizontal 
      tokens={{ childrenGap: theme.spacing.sm }} 
      horizontalAlign="space-between"
      wrap
      styles={{
        root: {
          width: '100%',
        }
      }}
    >
      <DefaultButton
        text="Nouveau"
        onClick={onNewTemplate}
        iconProps={{ iconName: 'Add' }}
        styles={compactButtonStyles}
      />
      
      <Stack horizontal tokens={{ childrenGap: theme.spacing.sm }}>
        <PrimaryButton
          text={t.insertTemplate || 'Insérer'}
          onClick={onInsertTemplate}
          iconProps={{ iconName: 'Mail' }}
          styles={compactButtonStyles}
          disabled={!hasTemplate}
        />
        <DefaultButton
          text="Copier"
          onClick={onCopyTemplate}
          iconProps={{ iconName: 'Copy' }}
          styles={compactButtonStyles}
          disabled={!hasTemplate}
        />
      </Stack>
    </Stack>
  );
}
