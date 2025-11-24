import React, { useState } from 'react';
import { Stack } from '@fluentui/react';
import { useEmailComposer } from '../hooks';
import { Header, Sidebar } from '../components/layout';
import { theme } from '../styles';
import TemplateChatInterface from '../components/features/chat/NewTemplate';

/**
 * Email Composer - Main container for composing new emails
 * Modern, polished UI with theme system
 */
const EmailComposerPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    // User & context
    user,
    currentEmail,
  } = useEmailComposer();

  

  if (!user) {
    return null;
  }

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
        } 
      }}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onDismiss={() => setSidebarOpen(false)}
      />

      {/* Universal Header */}
      <Header
        title="Email Composer"
        subtitle={currentEmail?.subject ? `→ ${currentEmail.subject}` : undefined}
        showMenu={true}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
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
        <TemplateChatInterface
          compose={true}
          llmActionProposal={[
            { actionKey: 'generate' },
            { actionKey: 'correct' },
            { actionKey: 'reformulate' }
          ]}
        />
      </Stack>
    </Stack>
  );
};

export default EmailComposerPage;
