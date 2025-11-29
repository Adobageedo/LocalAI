/**
 * Example component showing how to use unified EmailContext
 * Works with both Outlook (Office add-in) and Gmail (Chrome extension)
 */

import React from 'react';
import { Stack, Text, PrimaryButton, Spinner } from '@fluentui/react';
import { useEmail } from '../contexts/EmailContext';

export const EmailIntegrationExample: React.FC = () => {
  const {
    platform,
    isReady,
    currentEmail,
    isLoadingEmail,
    loadEmailContext,
    insertTemplate,
    setBodyContent,
    error,
  } = useEmail();

  const handleInsertReply = async () => {
    try {
      const template = "Thank you for your email. I'll get back to you soon.";
      await insertTemplate(template, false);
      console.log('Reply inserted successfully');
    } catch (err) {
      console.error('Failed to insert reply:', err);
    }
  };

  const handleSetBody = async () => {
    try {
      const content = "This is a new email body set by the AI assistant.";
      await setBodyContent(content);
      console.log('Body content set successfully');
    } catch (err) {
      console.error('Failed to set body:', err);
    }
  };

  if (!isReady) {
    return (
      <Stack tokens={{ padding: 20, childrenGap: 10 }}>
        <Spinner label="Initializing email integration..." />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack tokens={{ padding: 20 }}>
        <Text variant="large" styles={{ root: { color: 'red' } }}>
          Error: {error}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack tokens={{ padding: 20, childrenGap: 15 }}>
      {/* Platform indicator */}
      <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
        <Text variant="large">Platform:</Text>
        <Text variant="large" styles={{ root: { fontWeight: 600, color: '#0078d4' } }}>
          {platform === 'outlook' ? '📧 Outlook' : '✉️ Gmail'}
        </Text>
      </Stack>

      {/* Email data */}
      {isLoadingEmail ? (
        <Spinner label="Loading email..." />
      ) : currentEmail ? (
        <Stack tokens={{ childrenGap: 10 }} styles={{ root: { padding: 10, border: '1px solid #ccc' } }}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            Current Email:
          </Text>
          <Text><strong>From:</strong> {currentEmail.from}</Text>
          <Text><strong>Subject:</strong> {currentEmail.subject}</Text>
          <Text><strong>Body Preview:</strong> {currentEmail.body?.substring(0, 100)}...</Text>
        </Stack>
      ) : (
        <Text>No email loaded</Text>
      )}

      {/* Action buttons */}
      <Stack tokens={{ childrenGap: 10 }}>
        <PrimaryButton
          text="Reload Email Context"
          onClick={loadEmailContext}
          iconProps={{ iconName: 'Refresh' }}
        />

        {platform === 'outlook' && (
          <PrimaryButton
            text="Insert Reply (Outlook)"
            onClick={handleInsertReply}
            iconProps={{ iconName: 'Mail' }}
          />
        )}

        {platform === 'gmail' && (
          <>
            <PrimaryButton
              text="Insert Reply (Gmail)"
              onClick={handleInsertReply}
              iconProps={{ iconName: 'Mail' }}
            />
            <PrimaryButton
              text="Set Body Content (Gmail)"
              onClick={handleSetBody}
              iconProps={{ iconName: 'Edit' }}
            />
          </>
        )}
      </Stack>

      {/* Platform-specific tips */}
      <Stack styles={{ root: { marginTop: 20, padding: 10, backgroundColor: '#f3f2f1' } }}>
        <Text variant="small">
          {platform === 'outlook' && (
            <>
              💡 <strong>Outlook mode:</strong> Using Office.js APIs. Make sure you're in Outlook desktop or web.
            </>
          )}
          {platform === 'gmail' && (
            <>
              💡 <strong>Gmail mode:</strong> Using Chrome Extension APIs. Make sure content script is injected.
            </>
          )}
        </Text>
      </Stack>
    </Stack>
  );
};

export default EmailIntegrationExample;
