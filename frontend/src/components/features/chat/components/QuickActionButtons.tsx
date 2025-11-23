/**
 * Quick action buttons component
 */

import React from 'react';
import { Stack, DefaultButton, IContextualMenuProps, IContextualMenuItem } from '@fluentui/react';
import { QuickAction } from '../types';
import { LLM_QUICK_ACTIONS_DICTIONARY } from '../../../../config/llmQuickActions';
import { filterAttachmentsByExtension, buildFileContext } from '../utils/attachmentUtils';

interface QuickActionButtonsProps {
  actions: QuickAction[];
  onActionClick: (actionKey: string, customPrompt?: string, additionalContext?: string) => void;
}

export const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({
  actions,
  onActionClick
}) => {
  const buildMenuProps = (action: QuickAction): IContextualMenuProps | undefined => {
    if (!action.attachment && !action.email) return undefined;

    const items: IContextualMenuItem[] = [];

    // Add email item first if requested
    if (action.email) {
      items.push({
        key: 'email',
        text: 'Synthétiser Email',
        onClick: () => {
          onActionClick(action.actionKey, 'Synthétiser le contenu de l\'email');
        },
      });
    }

    // Filter and add only allowed attachments
    const filteredAttachments = filterAttachmentsByExtension(action.attachment);
    if (filteredAttachments && filteredAttachments.length > 0) {
      filteredAttachments.forEach((att) => {
        items.push({
          key: att.id,
          text: `Synthétiser ${att.name}`,
          onClick: () => {
            const fileContext = buildFileContext(att.name, att.content);
            onActionClick(action.actionKey, `Synthétiser ${att.name}`, fileContext);
          },
        });
      });
    }

    return items.length > 0 ? { items } : undefined;
  };

  return (
    <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
      {actions.map((action) => {
        const actionConfig = LLM_QUICK_ACTIONS_DICTIONARY[action.actionKey];
        if (!actionConfig) return null;

        const menuProps = buildMenuProps(action);
        
        return (
          <DefaultButton
            key={action.actionKey}
            text={actionConfig.label}
            iconProps={actionConfig.icon ? { iconName: actionConfig.icon } : undefined}
            onClick={() => !menuProps && onActionClick(action.actionKey)}
            menuProps={menuProps}
            styles={{ root: { borderRadius: 8 } }}
          />
        );
      })}
    </Stack>
  );
};
