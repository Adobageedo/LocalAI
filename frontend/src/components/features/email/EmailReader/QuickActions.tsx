import React from 'react';
import { Stack, PrimaryButton, Text } from '@fluentui/react';
import { theme } from '../../../../styles';
import InfoPDP from './QuickActions/InfoPDP';  // Update the import path
import RequestInvoicePO from './QuickActions/RequestInvoicePO';  // Update the import path
import ProdInvoice from './QuickActions/ProdInvoice';  // Update the import path

/**
 * QuickActions - Second tab in TemplateHub
 * Displays a set of predefined business actions.
 */
const QuickActions: React.FC = () => {
  const actions = [
    { key: 'infoPDP', label: 'Info PDP', component: <InfoPDP /> },
    { key: 'prodInvoice', label: 'Mail Facture Prod', component: <ProdInvoice /> },
    { key: 'createPDP', label: 'Créer PDP' },
    { key: 'notePoint', label: 'Noter point' },
    { key: 'givePO', label: 'Donner PO' },
    { key: 'requestInvoicePO', label: 'Demander Facture avec PO', component: <RequestInvoicePO /> },
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
          <React.Fragment key={action.key}>
            {action.component ? (
              action.component
            ) : (
              <PrimaryButton
                text={action.label}
                onClick={() => console.log(`Quick Action triggered: ${action.key}`)}
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
            )}
          </React.Fragment>
        ))}
      </Stack>
    </Stack>
  );
};

export default QuickActions;
