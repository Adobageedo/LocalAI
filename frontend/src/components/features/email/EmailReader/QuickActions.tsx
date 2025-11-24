import React from 'react';
import { Stack, PrimaryButton, Text } from '@fluentui/react';
import { theme } from '../../../../styles';
import TemplateSelector from './QuickActions/TemplateSelector';
import GeneratePDP from './QuickActions/GeneratePDP';
import SavePoint from './QuickActions/SavePoint';
import { useQuickAction } from '../../../../contexts/QuickActionContext';
import { useOffice } from '../../../../contexts/OfficeContext';

/**
 * QuickActions - Second tab in TemplateHub
 * Displays a set of predefined business actions.
 */
const QuickActions: React.FC = () => {
  const quickActionContext = useQuickAction();  
  
  const actions = [
    { key: 'templates', label: 'Templates Email', component: <TemplateSelector />, usesLLM: false },
    { key: 'createPDP', label: 'Generer PDP', component: <GeneratePDP />, usesLLM: true },
    { key: 'notePoint', label: 'Sauvegarder point', component: <SavePoint />, usesLLM: true },
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
    </Stack>
  );
};

export default QuickActions;
