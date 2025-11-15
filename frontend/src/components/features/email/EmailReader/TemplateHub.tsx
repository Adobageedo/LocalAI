import React, { useState } from 'react';
import { Stack, Pivot, PivotItem } from '@fluentui/react';
import { theme } from '../../../../styles';
import TemplateGenerator from './TemplateGenerator';
import QuickActions from './QuickActions';
import { Header, Sidebar } from '../../../layout';
import { QuickActionProvider } from '../../../../contexts/QuickActionContext';

/**
 * TemplateHub - Intermediate layer between App and TemplateGenerator
 * Provides tab navigation between Chat and Quick Actions.
 */
const TemplateHub: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QuickActionProvider>
      <Stack
        styles={{
          root: {
            height: '100vh',
            width: '100%',
            backgroundColor: theme.colors.white,
          },
        }}
      >
          {/* Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onDismiss={() => setSidebarOpen(false)}
          />
    
          {/* Universal Header */}
          <Header
            title="AI Assistant"
            showMenu={true}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          />
    
    
      <Pivot
        selectedKey={selectedKey}
        onLinkClick={(item) => setSelectedKey(item?.props.itemKey || 'chat')}
        styles={{
          root: {
            borderBottom: `1px solid ${theme.colors.borderLight}`,
            paddingLeft: theme.spacing.md,
            background: theme.colors.backgroundAlt,
          },
        }}
      >
        <PivotItem headerText="Chat" itemKey="chat" />
        <PivotItem headerText="Quick Actions" itemKey="quick" />
      </Pivot>

      {selectedKey === 'chat' && <TemplateGenerator />}
      {selectedKey === 'quick' && <QuickActions />}
      </Stack>
    </QuickActionProvider>
  );
};

export default TemplateHub;
