import React from 'react';
import { Stack, PrimaryButton, DefaultButton } from '@fluentui/react';
import { useTranslations } from '../../../../utils/i18n';

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
      tokens={{ childrenGap: 8 }} 
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
        styles={{
          root: {
            minWidth: 90,
            height: 36,
            borderRadius: 8,
            fontSize: 13,
          }
        }}
      />
      
      <Stack horizontal tokens={{ childrenGap: 8 }}>
        <PrimaryButton
          text={t.insertTemplate || 'Insérer'}
          onClick={onInsertTemplate}
          iconProps={{ iconName: 'Mail' }}
          styles={{
            root: {
              minWidth: 100,
              height: 36,
              borderRadius: 8,
              fontSize: 13,
            }
          }}
          disabled={!hasTemplate}
        />
        <DefaultButton
          text="Copier"
          onClick={onCopyTemplate}
          iconProps={{ iconName: 'Copy' }}
          styles={{
            root: {
              minWidth: 80,
              height: 36,
              borderRadius: 8,
              fontSize: 13,
            }
          }}
          disabled={!hasTemplate}
        />
      </Stack>
    </Stack>
  );
}
