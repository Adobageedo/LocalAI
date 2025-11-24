import React, { useState, useEffect } from 'react';
import { Stack, Panel, PanelType } from '@fluentui/react';
import { theme } from '../styles';
import TemplateGenerator from '../components/features/email/EmailReader/TemplateGenerator';
import QuickActions from '../components/features/email/EmailReader/QuickActions';
import { Header, Sidebar } from '../components/layout';
import { useQuickAction } from '../contexts/QuickActionContext';

/**
 * Inner component that uses QuickAction context
 */
const EmailReaderPageContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionsPanelOpen, setQuickActionsPanelOpen] = useState(false);
  const quickAction = useQuickAction();

  // Auto-close QuickActions panel when QuickAction streaming starts
  useEffect(() => {
    if (quickAction.state.isActive && quickAction.state.usesLLM) {
      setQuickActionsPanelOpen(false);
    }
  }, [quickAction.state.status, quickAction.state.isActive, quickAction.state.usesLLM]);

  return (
    <Stack
      styles={{
        root: {
          height: '100vh',
          width: '100%',
          backgroundColor: theme.colors.white,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
        showQuickActions={true}
        onQuickActionsClick={() => setQuickActionsPanelOpen(true)}
      />

      {/* Chat Interface - Takes remaining space */}
      <Stack
        styles={{
          root: {
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <TemplateGenerator quickActionKey={quickAction.state.actionKey} />
      </Stack>

      {/* Quick Actions Panel - Slides in from right */}
      <Panel
        isOpen={quickActionsPanelOpen}
        onDismiss={() => setQuickActionsPanelOpen(false)}
        type={PanelType.medium}
        headerText="Quick Actions"
        closeButtonAriaLabel="Close"
        styles={{
          main: {
            marginTop: 48, // Account for header height
          },
          content: {
            padding: 0,
          },
          scrollableContent: {
            height: '100%',
          }
        }}
      >
        <QuickActions />
      </Panel>
    </Stack>
  );
};

/**
 * EmailReaderPage - Email reading interface with AI chat assistant
 * Quick Actions accessible via header icon (top right)
 */
const EmailReaderPage: React.FC = () => {
  return (
      <EmailReaderPageContent />
  );
};

export default EmailReaderPage;
