import React from 'react';
import { 
  Panel, 
  PanelType, 
  IconButton, 
  Stack, 
  Text,
  DefaultButton
} from '@fluentui/react';
import EmailSync from './EmailSync';
import AuthSection from './AuthSection';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslations } from '../../utils/i18n';

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
      headerText={t.settings || "Settings"}
      closeButtonAriaLabel={t.close || "Close"}
      styles={{
        main: { maxWidth: '350px' },
        content: { padding: 0 }
      }}
    >
      <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '0 16px' } }}>
        <Stack.Item>
          <AuthSection />
        </Stack.Item>
        
        {user && user.email && (
          <Stack.Item>
            <EmailSync userEmail={user.email} />
          </Stack.Item>
        )}
        
        <Stack.Item>
          <Stack horizontal horizontalAlign="end" style={{ marginTop: '20px', padding: '0 16px 16px 0' }}>
            <DefaultButton 
              onClick={onDismiss}
              text={t.close || "Close"}
            />
          </Stack>
        </Stack.Item>
      </Stack>
    </Panel>
  );
};

export default Sidebar;
