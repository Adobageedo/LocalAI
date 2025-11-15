import React from 'react';
import { Stack, PrimaryButton, Text } from '@fluentui/react';
import { theme } from '../../../../styles';
import InfoPDP from './QuickActions/InfoPDP';
import RequestInvoicePO from './QuickActions/RequestInvoicePO';
import ProdInvoice from './QuickActions/ProdInvoice';
import GeneratePDP from './QuickActions/GeneratePDP';
import SavePoint from './QuickActions/SavePoint';
import NewTemplate from '../../chat/NewTemplate';
import { useQuickAction } from '../../../../contexts/QuickActionContext';
import { useOffice } from '../../../../contexts/OfficeContext';

/**
 * QuickActions - Second tab in TemplateHub
 * Displays a set of predefined business actions.
 */
const QuickActions: React.FC = () => {
  const quickActionContext = useQuickAction();
  const { currentEmail } = useOffice();
  
  // Define which actions use LLM/MCP (will show NewTemplate)
  const actionsUsingLLM = ['createPDP', 'notePoint'];
  
  const actions = [
    { key: 'infoPDP', label: 'Demander information PDP', component: <InfoPDP />, usesLLM: false },
    { key: 'prodInvoice', label: 'Mail Facture Prod', component: <ProdInvoice />, usesLLM: false },
    { key: 'createPDP', label: 'Generer PDP', component: <GeneratePDP />, usesLLM: true },
    { key: 'notePoint', label: 'Sauvegarder point', component: <SavePoint />, usesLLM: true },
    { key: 'givePO', label: 'Donner PO', usesLLM: false },
    { key: 'requestInvoicePO', label: 'Demander Facture avec PO', component: <RequestInvoicePO />, usesLLM: false },
  ];
  
  const showNewTemplate = quickActionContext.state.isActive && 
    quickActionContext.state.usesLLM && 
    quickActionContext.state.status !== 'idle';

  return (
    <Stack
      horizontal={showNewTemplate}
      tokens={{ childrenGap: 0 }}
      styles={{
        root: {
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        },
      }}
    >
      {/* Quick Actions Panel */}
      <Stack
        horizontalAlign="center"
        verticalAlign="center"
        tokens={{ childrenGap: theme.spacing.lg }}
        styles={{
          root: {
            padding: theme.spacing.xl,
            backgroundColor: theme.colors.white,
            flex: showNewTemplate ? '0 0 400px' : 1,
            height: '100%',
            overflowY: 'auto',
            borderRight: showNewTemplate ? `1px solid ${theme.colors.borderLight}` : 'none',
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
      
      {/* Conditionally show NewTemplate when LLM action is active */}
      {showNewTemplate && (
        <Stack
          styles={{
            root: {
              flex: 1,
              height: '100%',
              backgroundColor: theme.colors.backgroundAlt,
            },
          }}
        >
          <NewTemplate
            conversationId={`quickaction_${quickActionContext.state.actionKey}_${Date.now()}`}
            onTemplateUpdate={(template) => {
              console.log('Template updated:', template);
            }}
            compose={false}
            emailContext={{
              subject: currentEmail?.subject,
              from: currentEmail?.from,
              body: currentEmail?.body,
            }}
          />
        </Stack>
      )}
    </Stack>
  );
};

export default QuickActions;
