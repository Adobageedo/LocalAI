import React from 'react';
import { 
  Panel, 
  PanelType, 
  IconButton, 
  Stack, 
  Text,
  DefaultButton,
  getTheme,
  FontWeights,
  mergeStyles
} from '@fluentui/react';
import { Settings24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import EmailSync from './EmailSync';
import AuthSection from './AuthSection';
import UserPreferences from './UserPreferences';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslations } from '../../../utils/i18n';

interface SidebarProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onDismiss }) => {
  const { user } = useAuth();
  const t = useTranslations();
  const theme = getTheme();
  
  const headerStyles = mergeStyles({
    background: `linear-gradient(135deg, ${theme.palette.themePrimary}, ${theme.palette.themeSecondary})`,
    color: theme.palette.white,
    padding: '24px',
    borderRadius: '0 0 16px 16px',
    marginBottom: '24px',
    boxShadow: '0 4px 16px rgba(0, 120, 212, 0.2)'
  });
  
  const titleStyles = mergeStyles({
    fontSize: '18px',
    fontWeight: FontWeights.bold,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  });
  
  const modernButtonStyles = {
    root: {
      borderRadius: '12px',
      height: '40px',
      fontSize: '14px',
      fontWeight: FontWeights.semibold,
      minWidth: '100px',
      transition: 'all 0.2s ease-in-out'
    }
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.medium}
      hasCloseButton={false}
      styles={{
        main: { 
          maxWidth: '400px',
          backgroundColor: '#fafbfc'
        },
        content: { 
          padding: 0,
          backgroundColor: '#fafbfc'
        },
        header: {
          display: 'none'
        }
      }}
      customWidth="400px"
    >
      <div className={headerStyles}>
        <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
          <Text className={titleStyles}>
            <Settings24Regular /> Paramètres 
          </Text>
          <IconButton 
            iconProps={{ iconName: 'Cancel' }}
            onClick={onDismiss}
            styles={{
              root: {
                color: theme.palette.white,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }
              }
            }}
          />
        </Stack>
      </div>
      
      <Stack tokens={{ childrenGap: 24 }} styles={{ root: { padding: '0 24px 24px 24px' } }}>
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
          <Stack horizontal horizontalAlign="center" styles={{ root: { marginTop: '20px' } }}>
            <DefaultButton 
              onClick={onDismiss}
              text={t.close || "Fermer"}
              styles={modernButtonStyles}
              iconProps={{ iconName: 'Cancel' }}
            />
          </Stack>
        </Stack.Item>
      </Stack>
    </Panel>
  );
};

export default Sidebar;
