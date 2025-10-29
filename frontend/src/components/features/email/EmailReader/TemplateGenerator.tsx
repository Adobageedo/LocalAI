import React from 'react';
import { Stack, Text } from '@fluentui/react';
import { Sparkle24Filled } from '@fluentui/react-icons';
import { useTemplateGeneration } from './useTemplateGeneration';
import { ActionButtons } from './ActionButtons';
import { StatusMessages } from './StatusMessages';
import { LoadingIndicator } from './LoadingIndicator';
import { theme } from '../../../../styles';
import TemplateChatInterface from '../TemplateChat/NewTemplate';

/**
 * Template Generator - Main container for email template generation
 * Modern, polished UI with theme system
 */
const TemplateGenerator: React.FC = () => {
  const {
    // User & context
    user,
    currentEmail,
    
    // State
    attachments,
    additionalInfo,
    tone,
    generatedTemplate,
    isStreaming,
    error,
    success,
    conversationId,
    
    // Actions
    handleInsertTemplate,
    handleCopyTemplate,
    handleNewTemplate,
    handleTemplateUpdate,
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
      {/* Compact Header */}
      <Stack 
        horizontal 
        verticalAlign="center" 
        horizontalAlign="space-between"
        styles={{
          root: {
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            borderBottom: `1px solid ${theme.colors.borderLight}`,
            backgroundColor: theme.colors.white,
            minHeight: 48,
            boxShadow: theme.shadows.sm,
          }
        }}
      >
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: theme.spacing.sm }}>
          <Sparkle24Filled style={{ color: theme.colors.primary, fontSize: 20 }} />
          <Text 
            variant="medium" 
            styles={{ 
              root: { 
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text,
              } 
            }}
          >
            AI Assistant
          </Text>
          {currentEmail?.subject && (
            <Text 
              variant="small" 
              styles={{ 
                root: { 
                  color: theme.colors.textSecondary,
                  marginLeft: theme.spacing.md,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 300,
                  [theme.mediaQueries.mobile]: {
                    display: 'none',
                  }
                } 
              }}
            >
              → {currentEmail.subject}
            </Text>
          )}
        </Stack>
      </Stack>

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
            flex: 1,
            overflow: 'hidden',
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
              padding: `0 ${theme.spacing.md}px`,
            }
          }}
        >
          <TemplateChatInterface
            conversationId={conversationId || Date.now().toString()}
            onTemplateUpdate={handleTemplateUpdate}
            emailContext={{
              subject: currentEmail?.subject,
              from: currentEmail?.from,
              additionalInfo,
              tone,
              body: currentEmail?.body,
              attachments: attachments.map(att => ({
                name: att.name,
                content: att.content
              }))
            }}
            quickActions={[
              { actionKey: 'reply' },
              { 
                actionKey: 'summarize', 
                email: true, 
                attachment: attachments.map(att => ({
                  name: att.name,
                  id: att.id,
                  content: att.content,
                  contentType: att.contentType
                }))
              },
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
          onCopyTemplate={handleCopyTemplate}
          hasTemplate={!!generatedTemplate}
        />
      </Stack>
    </Stack>
  );
};

export default TemplateGenerator;
