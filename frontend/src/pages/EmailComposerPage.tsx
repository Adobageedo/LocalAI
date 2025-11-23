import React, { useState } from 'react';
import { Stack } from '@fluentui/react';
import { useEmailComposer } from '../hooks';
import { ActionButtons, StatusMessages, LoadingIndicator } from '../components/common';
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
    
    // State
    isStreaming,
    error,
    success,
    
    // Actions
    handleInsertTemplate,
    handleNewTemplate,
    hasAssistantMessage,
    clearError,
    clearSuccess,
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

      {/* Status Messages */}
      {(error || success) && (
        <Stack styles={{ root: { padding: `${theme.spacing.xs}px ${theme.spacing.md}px` } }}>
          <StatusMessages
            error={error}
            success={success}
            onDismissError={clearError}
            onDismissSuccess={clearSuccess}
          />
        </Stack>
      )}

      {/* Main Chat Area - Takes full remaining space */}
      <Stack
        styles={{
          root: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        {/* Loading Indicator */}
        {isStreaming && (
          <Stack styles={{ root: { padding: `${theme.spacing.xs}px ${theme.spacing.md}px` } }}>
            <LoadingIndicator isLoading={isStreaming} />
          </Stack>
        )}

        {/* Chat Interface - Full height */}
        <Stack
          styles={{
            root: {
              flex: 1,
              overflow: 'auto',
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

      {/* Compact Action Bar at Bottom */}
      <Stack
        styles={{
          root: {
            borderTop: `1px solid ${theme.colors.borderLight}`,
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            backgroundColor: theme.colors.backgroundAlt,
          }
        }}
      >
        <ActionButtons
          onNewTemplate={handleNewTemplate}
          onInsertTemplate={handleInsertTemplate}
          hasTemplate={hasAssistantMessage()}
        />
      </Stack>
    </Stack>
  );
};

export default EmailComposerPage;
