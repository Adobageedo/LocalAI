import React, { useState, useEffect } from 'react';
import { Stack, Pivot, PivotItem } from '@fluentui/react';
import { theme } from '../../../../styles';
import TemplateGenerator from './TemplateGenerator';
import QuickActions from './QuickActions';
import { Header, Sidebar } from '../../../layout';
import { QuickActionProvider, useQuickAction } from '../../../../contexts/QuickActionContext';

/**
 * Inner component that uses QuickAction context
 */
const TemplateHubContent: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const quickAction = useQuickAction();

  // Auto-switch to Chat tab when QuickAction streaming starts
  useEffect(() => {
    if (quickAction.state.isActive && quickAction.state.usesLLM) {
      setSelectedKey('chat');
    }

  }, [quickAction.state.status, quickAction.state.isActive, quickAction.state.usesLLM]);

  return (
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

      {selectedKey === 'chat' && <TemplateGenerator quickActionKey={quickAction.state.actionKey} />}
      {selectedKey === 'quick' && <QuickActions />}
      </Stack>
  );
};

/**
 * TemplateHub - Intermediate layer between App and TemplateGenerator
 * Provides tab navigation between Chat and Quick Actions.
 */
const TemplateHub: React.FC = () => {
  return (
    <QuickActionProvider>
      <TemplateHubContent />
    </QuickActionProvider>
  );
};

export default TemplateHub;
