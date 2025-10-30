import React from 'react';
import { 
  Panel, 
  PanelType, 
  IconButton, 
  Stack, 
  Text,
  DefaultButton
} from '@fluentui/react';
import { Settings24Regular } from '@fluentui/react-icons';
import EmailSync from './EmailSync';
import AuthSection from './AuthSection';
import UserPreferences from './UserPreferences';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslations } from '../../../utils/i18n';
import { theme, secondaryButtonStyles } from '../../../styles';

interface SidebarProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onDismiss }) => {
  const { user } = useAuth();
  const t = useTranslations();

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.medium}
      hasCloseButton={false}
      styles={{
        main: { 
          maxWidth: '400px',
          backgroundColor: theme.colors.background
        },
        content: { 
          padding: 0,
          backgroundColor: theme.colors.background
        },
        header: {
          display: 'none'
        }
      }}
      customWidth="400px"
    >
      {/* Header */}
      <Stack
        styles={{
          root: {
            background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`,
            color: theme.colors.white,
            padding: theme.spacing.xxl,
            borderRadius: `0 0 ${theme.borderRadius.large}px ${theme.borderRadius.large}px`,
            marginBottom: theme.spacing.xxl,
            boxShadow: theme.shadows.md
          }
        }}
      >
        <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: theme.spacing.md }}>
            <Settings24Regular style={{ fontSize: 20 }} />
            <Text 
              styles={{ 
                root: { 
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.white
                } 
              }}
            >
              Paramètres
            </Text>
          </Stack>
          <IconButton 
            iconProps={{ iconName: 'Cancel' }}
            onClick={onDismiss}
            styles={{
              root: {
                color: theme.colors.white,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: theme.borderRadius.medium,
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }
              }
            }}
          />
        </Stack>
      </Stack>
      
      {/* Content */}
      <Stack 
        tokens={{ childrenGap: theme.spacing.xxl }} 
        styles={{ root: { padding: `0 ${theme.spacing.xxl}px ${theme.spacing.xxl}px` } }}
      >
        <Stack.Item>
          <AuthSection />
        </Stack.Item>
        
        {user && user.email && (
          <Stack.Item>
            <EmailSync userEmail={user.email} />
          </Stack.Item>
        )}
        
        {user && (
          <Stack.Item>
            <UserPreferences />
          </Stack.Item>
        )}
        
        <Stack.Item>
          <Stack horizontal horizontalAlign="center" styles={{ root: { marginTop: theme.spacing.lg } }}>
            <DefaultButton 
              onClick={onDismiss}
              text={t.close || "Fermer"}
              styles={secondaryButtonStyles}
              iconProps={{ iconName: 'Cancel' }}
            />
          </Stack>
        </Stack.Item>
      </Stack>
    </Panel>
  );
};

export default Sidebar;
