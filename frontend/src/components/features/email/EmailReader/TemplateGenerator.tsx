import React, { useState } from 'react';
import { Stack } from '@fluentui/react';
import { useTemplateGeneration } from '../../../../hooks';
import { ActionButtons, StatusMessages, LoadingIndicator } from '../../../common';
import { theme } from '../../../../styles';
import TemplateChatInterface from '../../chat/NewTemplate';

interface TemplateGeneratorProps {
  quickActionKey?: string | null;
}

/**
 * Template Generator - Main container for email template generation
 * Modern, polished UI with theme system
 */
const TemplateGenerator: React.FC<TemplateGeneratorProps> = ({ quickActionKey }) => {  
  const {
    // User & context
    user,
    
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
  } = useTemplateGeneration();

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
            compose={false}
            quickActionKey={quickActionKey}
            llmActionProposal={[
              { actionKey: 'reply' },
              { actionKey: 'summarize', email: true },
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
          onInsertTemplate={() => handleInsertTemplate(true)}
          hasTemplate={hasAssistantMessage()}
        />
      </Stack>
    </Stack>
  );
};

export default TemplateGenerator;
