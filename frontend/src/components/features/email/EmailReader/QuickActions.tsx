import React from 'react';
import { Stack, PrimaryButton, Text } from '@fluentui/react';
import { theme } from '../../../../styles';

/**
 * QuickActions - Second tab in TemplateHub
 * Displays a set of predefined business actions.
 */
const QuickActions: React.FC = () => {
  const actions = [
    { key: 'infoPDP', label: 'Info PDP' },
    { key: 'createPDP', label: 'Créer PDP' },
    { key: 'notePoint', label: 'Noter point' },
    { key: 'givePO', label: 'Donner PO' },
    { key: 'requestInvoicePO', label: 'Demander Facture avec PO' },
  ];

  const handleActionClick = (actionKey: string) => {
    // Placeholder: you can later integrate specific flows or Office add-in actions
    console.log(`Quick Action triggered: ${actionKey}`);
    alert(`Action "${actionKey}" triggered.`);
  };

  return (
    <Stack
      horizontalAlign="center"
      verticalAlign="center"
      verticalFill
      tokens={{ childrenGap: theme.spacing.lg }}
      styles={{
        root: {
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.white,
          height: '100%',
        },
      }}
    >
      <Text
        variant="xLarge"
        styles={{
          root: {
            fontWeight: 600,
            marginBottom: theme.spacing.lg,
          },
        }}
      >
        Actions Rapides
      </Text>

      <Stack
        horizontal
        wrap
        horizontalAlign="center"
        tokens={{ childrenGap: theme.spacing.md, padding: theme.spacing.md }}
      >
        {actions.map((action) => (
          <PrimaryButton
            key={action.key}
            text={action.label}
            onClick={() => handleActionClick(action.key)}
            styles={{
              root: {
                width: 220,
                height: 50,
                fontWeight: 600,
                borderRadius: theme.effects.roundedCorner2,
                boxShadow: theme.effects.elevation8,
              },
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
};

export default QuickActions;
